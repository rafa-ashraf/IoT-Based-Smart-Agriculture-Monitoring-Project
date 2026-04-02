const express = require('express');
const router = express.Router();
const { InfluxDB } = require('@influxdata/influxdb-client');
const { GoogleGenAI } = require('@google/genai');

// ========================
// INIT CLIENTS
// ========================
const influxDB = new InfluxDB({
  url: process.env.INFLUXDB_URL,
  token: process.env.INFLUXDB_TOKEN,
});
const queryApi = influxDB.getQueryApi(process.env.ORG);
const BUCKET = process.env.BUCKET;
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

// ========================
// HELPERS
// ========================
function getRange(range) {
  switch (range) {
    case "7d": return "-7d";
    case "1m": return "-30d";
    default: return "-24h";
  }
}

// Simple retry utility for AI calls
async function retry(fn, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ========================
// GET LATEST SENSOR DATA
// ========================
router.get('/:deviceId', (req, res) => {
  const deviceId = req.params.deviceId;

  const query = `
    from(bucket: "${BUCKET}")
      |> range(start: -7d)
      |> filter(fn: (r) => r._measurement == "agri_telemetry")
      |> filter(fn: (r) => r.device_id == "${deviceId}")
      |> last()
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  `;

  let result = {};

  queryApi.queryRows(query, {
    next(row, tableMeta) {
      const o = tableMeta.toObject(row);
      result = {
        temperature: o.temperature_c,
        humidity: o.humidity_pct,
        moisture: o.soil_moisture_pct,
        light: o.light_raw,
      };
    },
    error: (err) => {
      console.error('InfluxDB error:', err);
      res.status(500).json({ error: err.message });
    },
    complete() {
      let status = "optimal";
      if (result.moisture !== undefined && result.moisture < 20) status = "critical";
      else if (result.temperature !== undefined && result.temperature > 35) status = "warning";

      res.json({ deviceId, ...result, status });
    },
  });
});

// ========================
// GET HISTORY (FIELD + RANGE)
// ========================
router.get('/:deviceId/history', (req, res) => {
  const deviceId = req.params.deviceId;
  const field = req.query.field || 'temperature_c';
  const rangeParam = req.query.range || '24h';
  const aggregate = req.query.aggregate || (rangeParam === "24h" ? "10m" : "1h");
  const startRange = getRange(rangeParam);

  const query = `
    from(bucket: "${BUCKET}")
      |> range(start: ${startRange})
      |> filter(fn: (r) => r._measurement == "agri_telemetry")
      |> filter(fn: (r) => r.device_id == "${deviceId}")
      |> filter(fn: (r) => r._field == "${field}")
      |> aggregateWindow(every: ${aggregate}, fn: mean, createEmpty: false)
      |> sort(columns: ["_time"], desc: false)
  `;

  const results = [];
  queryApi.queryRows(query, {
    next(row, tableMeta) {
      const o = tableMeta.toObject(row);
      results.push({ value: o._value, timestamp: o._time });
    },
    error(err) {
      console.error("InfluxDB error:", err);
      res.status(500).json({ error: err.message });
    },
    complete() {
      res.json(results);
    },
  });
});

// ========================
// GET AI INSIGHTS (Smart Alert)
// ========================
router.get('/:deviceId/ai', (req, res) => {
  const deviceId = req.params.deviceId;

  const query = `
    from(bucket: "${BUCKET}")
      |> range(start: -7d)
      |> filter(fn: (r) => r._measurement == "agri_telemetry")
      |> filter(fn: (r) => r.device_id == "${deviceId}")
      |> last()
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  `;

  let sensorData = null;

  queryApi.queryRows(query, {
    next(row, tableMeta) {
      const o = tableMeta.toObject(row);
      sensorData = {
        temperature: o.temperature_c,
        humidity: o.humidity_pct,
        moisture: o.soil_moisture_pct,
        light: o.light_raw,
      };
    },
    async complete() {
      try {
        if (!sensorData) {
          return res.status(404).json({ error: "No sensor data found" });
        }

        const prompt = `
You are an agricultural expert.

Analyze:
Temperature: ${sensorData.temperature} °C
Humidity: ${sensorData.humidity} %
Soil Moisture: ${sensorData.moisture} %
Light: ${sensorData.light}

Respond EXACTLY in this format:
Status: optimal/warning/critical
Reason: one short sentence
Action: one short recommendation
        `;

        // Merge all context into a natural multi-turn prompt
const mergedPrompt = fullContext
  .map((m) => `(${m.role.toUpperCase()}) ${m.content}`)
  .join("\n\n");

const result = await genAI.models.generateContent({
  model: "gemini-2.5-flash",
  contents: mergedPrompt,
});

        const aiText = result.output_text || "";
        const lines = aiText.split("\n").map(l => l.trim()).filter(Boolean);
        const aiJson = {
          status: lines.find(l => l.startsWith("Status:"))?.split(":")[1]?.trim() || "unknown",
          reason: lines.find(l => l.startsWith("Reason:"))?.split(":")[1]?.trim() || "AI unavailable",
          action: lines.find(l => l.startsWith("Action:"))?.split(":")[1]?.trim() || "Check manually",
        };

        const severityMap = {
          optimal: "low",
          warning: "medium",
          critical: "critical",
          unknown: "medium",
        };

        res.json({
          deviceId,
          ...sensorData,
          ai: aiJson,
          aiAlert: {
            id: `ai-${Date.now()}`,
            message: aiJson.reason,
            aiInsight: aiJson.action,
            severity: severityMap[aiJson.status],
            zoneId: deviceId,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.error("AI ERROR:", err);
        res.json({
          deviceId,
          ...sensorData,
          ai: { status: "unknown", reason: "AI unavailable", action: "Check manually" },
          aiAlert: {
            id: `ai-${Date.now()}`,
            message: "AI temporarily unavailable. Check manually.",
            severity: "medium",
            zoneId: deviceId,
            timestamp: new Date().toISOString(),
          },
        });
      }
    },
    error(err) {
      console.error("Influx ERROR:", err);
      res.status(500).json({ error: err.message });
    },
  });
});

// ========================
// POST CHAT MESSAGE (fixed for @google/genai)
// ========================
router.post('/:deviceId/chat', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { message, conversation } = req.body;

    if (!message) return res.status(400).json({ error: "No message provided" });

    // ✅ The "system" message is just part of the user's prompt — not a real chat role.
    const systemInstructions = `
You are an AI agricultural assistant built into the farm monitoring dashboard.
Your role: explain sensor data, interpret alerts, and give farming recommendations.

Tone: friendly, practical, and clear.
If the question is vague, politely ask for clarification.
Never say you can control devices.
`;

    // ✅ Build a single flattened prompt Gemini accepts
    let prompt = `${systemInstructions}\n\n`;
    if (conversation && Array.isArray(conversation)) {
      for (const c of conversation) {
        prompt += `${c.role.toUpperCase()}: ${c.content}\n`;
      }
    }
    prompt += `USER: ${message}\nMODEL:`; // end with MODEL cue for best response context

    // ✅ Generate content (note: only "USER" and "MODEL" roles are valid internally)
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const reply = result.output_text?.trim() || "I'm not sure — could you clarify that?";
    res.json({ deviceId, reply });
  } catch (err) {
    console.error("Chat ERROR:", err);
    res.status(500).json({ error: "AI chat failed" });
  }
});

module.exports = router;
