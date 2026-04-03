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
    case "30d": return "-30d";
    case "90d": return "-90d";
    case "1m": return "-30d";
    default: return "-24h";
  }
}

function chunkArray(arr, size = 5) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function safeJSONParse(text) {
  if (!text) return [];
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    return [];
  }
}

function withTimeout(promise, ms = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms)
    ),
  ]);
}

function extractModelText(result) {
  if (result?.output_text) return result.output_text;
  const candidateParts = result?.candidates?.[0]?.content?.parts;
  if (Array.isArray(candidateParts)) {
    const joined = candidateParts
      .map((p) => p?.text)
      .filter(Boolean)
      .join("\n")
      .trim();
    if (joined) return joined;
  }
  return "";
}

function asNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "critical" || s === "warning" || s === "optimal") return s;
  return "warning";
}

function buildRuleBasedAlert(device) {
  const temperature = asNumber(device.temperature);
  const humidity = asNumber(device.humidity);
  const moisture = asNumber(device.moisture);
  const light = asNumber(device.light);

  const issues = [];
  const actions = [];
  let status = "optimal";

  if (moisture !== null) {
    if (moisture < 20) {
      status = "critical";
      issues.push(`soil moisture is very low (${moisture}%)`);
      actions.push("Irrigate now and verify pump/drip line flow");
    } else if (moisture < 35) {
      if (status !== "critical") status = "warning";
      issues.push(`soil moisture is low (${moisture}%)`);
      actions.push("Increase irrigation duration in the next cycle");
    } else if (moisture > 85) {
      if (status !== "critical") status = "warning";
      issues.push(`soil moisture is very high (${moisture}%)`);
      actions.push("Reduce irrigation and check drainage");
    }
  }

  if (temperature !== null) {
    if (temperature >= 40) {
      status = "critical";
      issues.push(`temperature is dangerously high (${temperature}C)`);
      actions.push("Apply immediate cooling or shade and water during cool hours");
    } else if (temperature >= 35) {
      if (status !== "critical") status = "warning";
      issues.push(`temperature is high (${temperature}C)`);
      actions.push("Add shade and monitor plant stress this afternoon");
    } else if (temperature <= 5) {
      status = "critical";
      issues.push(`temperature is near frost risk (${temperature}C)`);
      actions.push("Protect crops with covers and delay irrigation overnight");
    }
  }

  if (humidity !== null) {
    if (humidity >= 90) {
      if (status === "optimal") status = "warning";
      issues.push(`humidity is very high (${humidity}%)`);
      actions.push("Improve airflow and monitor fungal disease pressure");
    } else if (humidity <= 25) {
      if (status === "optimal") status = "warning";
      issues.push(`humidity is very low (${humidity}%)`);
      actions.push("Reduce midday stress and consider short misting intervals");
    }
  }

  if (light !== null && light < 100) {
    if (status === "optimal") status = "warning";
    issues.push(`light level is low (${light})`);
    actions.push("Check sensor placement or crop shading conditions");
  }

  if (!issues.length) {
    return {
      deviceId: device.deviceId,
      status: "optimal",
      reason: "All monitored values are within normal operating ranges",
      action: "Continue current irrigation and monitoring schedule",
    };
  }

  return {
    deviceId: device.deviceId,
    status,
    reason: issues.slice(0, 2).join("; "),
    action: actions[0] || "Inspect the device and field conditions",
  };
}

function normalizeAIAlerts(parsed, chunk) {
  const fallbackMap = new Map(chunk.map((d) => [d.deviceId, buildRuleBasedAlert(d)]));
  if (!Array.isArray(parsed)) {
    return Array.from(fallbackMap.values());
  }

  for (const alert of parsed) {
    const deviceId = alert?.deviceId;
    if (!deviceId || !fallbackMap.has(deviceId)) continue;
    const fallback = fallbackMap.get(deviceId);
    fallbackMap.set(deviceId, {
      deviceId,
      status: normalizeStatus(alert?.status),
      reason: String(alert?.reason || fallback.reason),
      action: String(alert?.action || fallback.action),
    });
  }

  return Array.from(fallbackMap.values());
}

function normalizeConversation(conversation = []) {
  if (!Array.isArray(conversation)) return [];
  return conversation
    .filter((m) => m && typeof m.content === "string")
    .map((m) => {
      const role = String(m.role || "").toLowerCase();
      return {
        role: role === "assistant" ? "assistant" : "user",
        content: m.content.trim().slice(0, 1200),
      };
    })
    .filter((m) => m.content.length > 0)
    .slice(-10);
}

// ========================
// DISCOVERY HELPERS
// ========================
async function getAllDeviceIds() {
  const query = `
    import "influxdata/influxdb/schema"
    schema.tagValues(bucket: "${BUCKET}", tag: "device_id")
  `;
  const ids = [];
  await new Promise((resolve, reject) => {
    queryApi.queryRows(query, {
      next(row, meta) {
        const o = meta.toObject(row);
        if (o._value) ids.push(o._value);
      },
      error: reject,
      complete: resolve,
    });
  });
  return ids;
}

async function getLatestTelemetry(deviceId) {
  const queryLatest = `
    from(bucket: "${BUCKET}")
      |> range(start: -7d)
      |> filter(fn: (r) => r._measurement == "agri_telemetry")
      |> filter(fn: (r) => r.device_id == "${deviceId}")
      |> last()
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  `;

  let latest = null;
  await new Promise((resolve, reject) => {
    queryApi.queryRows(queryLatest, {
      next(row, meta) {
        const o = meta.toObject(row);
        latest = {
          deviceId,
          temperature: o.temperature_c,
          humidity: o.humidity_pct,
          moisture: o.soil_moisture_pct,
          light: o.light_raw,
          timestamp: o._time,
        };
      },
      error: reject,
      complete: resolve,
    });
  });

  return latest;
}

async function generateChatReply(deviceId, message, conversation) {
  const userMessage = String(message || "").trim();
  if (!userMessage) {
    return {
      status: 400,
      body: { reply: "Please type a question so I can help." },
    };
  }
  if (userMessage.length > 1200) {
    return {
      status: 400,
      body: { reply: "Please keep your message under 1200 characters." },
    };
  }

  const latest = await getLatestTelemetry(deviceId).catch(() => null);
  const history = normalizeConversation(conversation);
  const historyText = history
    .map((m) => `${m.role === "assistant" ? "assistant" : "user"}: ${m.content}`)
    .join("\n");

  const telemetryText = latest?.timestamp
    ? `Latest telemetry for ${deviceId}:
- Temperature: ${latest.temperature ?? "N/A"} C
- Humidity: ${latest.humidity ?? "N/A"} %
- Soil moisture: ${latest.moisture ?? "N/A"} %
- Light: ${latest.light ?? "N/A"}
- Timestamp: ${latest.timestamp}`
    : `No recent telemetry found for ${deviceId}.`;

  const prompt = `
You are an AI agricultural assistant in a farm dashboard.
Goal: Provide clear, practical, and safe recommendations.

Response style:
- Keep responses concise (about 3-6 sentences).
- Use plain language and practical next steps.
- If data is missing, say what is missing and what to check.
- Never claim you changed devices or irrigation settings.

${telemetryText}

Conversation context:
${historyText || "(none)"}

User question:
${userMessage}
`;

  const result = await withTimeout(
    genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ type: "text", text: prompt }],
    }),
    30000
  );

  const reply = extractModelText(result).trim() || "I couldn't generate advice right now. Please try again.";
  return {
    status: 200,
    body: {
      reply,
      meta: {
        deviceId,
        hasTelemetry: Boolean(latest?.timestamp),
        telemetryTimestamp: latest?.timestamp || null,
      },
    },
  };
}

// ========================
// GET AI INSIGHTS (Smart Alerts)
// ========================
router.get("/alerts", async (req, res) => {
  try {
    // Get all device IDs
    const devices = await getAllDeviceIds();
    if (!devices.length) return res.json([]);

    // Fetch latest telemetry for all devices
    const validData = [];
    for (const deviceId of devices) {
      const latest = await getLatestTelemetry(deviceId);
      if (latest?.timestamp) validData.push(latest);
    }

    if (!validData.length) return res.json([]);

    // ========================
    // AI-BASED SMART ALERTS
    // ========================
    const aiAlerts = [];
    const chunkSize = 5;
    const chunks = chunkArray(validData, chunkSize);

    for (const chunk of chunks) {

      const prompt = `
You are an expert in agriculture monitoring. Analyze these devices.

Return a JSON array ONLY.
Do not include markdown, explanations, or code fences.
Each object must use one of these statuses exactly: optimal, warning, critical.
Each object:
{
  "deviceId": string,
  "status": "optimal" | "warning" | "critical",
  "reason": "short explanation",
  "action": "short recommendation"
}

DATA:
${chunk.map(d => `
Device ${d.deviceId}:
Temperature: ${d.temperature ?? "N/A"}
Humidity: ${d.humidity ?? "N/A"}
Moisture: ${d.moisture ?? "N/A"}
Light: ${d.light ?? "N/A"}
`).join("\n")}
`;

      try {
        const result = await withTimeout(
          genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ type: "text", text: prompt }],
          }),
          25000 // longer timeout for AI
        );

        const text = extractModelText(result);
        const parsed = safeJSONParse(text);
        const normalized = normalizeAIAlerts(parsed, chunk);
        normalized.forEach((a) => aiAlerts.push(a));
      } catch (err) {
        console.error("Chunk AI failed:", err);
        const fallback = chunk.map((d) => buildRuleBasedAlert(d));
        fallback.forEach((a) => aiAlerts.push(a));
      }
    }

    res.json(aiAlerts);

  } catch (err) {
    console.error("AI Alerts error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========================
// MULTI-SENSOR OVERVIEW
// ========================
router.get('/', async (req, res) => {
  try {
    const deviceIds = await getAllDeviceIds();
    const records = [];

    for (const deviceId of deviceIds) {
      const latest = await getLatestTelemetry(deviceId);
      if (latest?.timestamp) {
        let status = "optimal";
        if (latest.moisture !== undefined && latest.moisture < 20) status = "critical";
        else if (latest.temperature !== undefined && latest.temperature > 35) status = "warning";
        records.push({ ...latest, status });
      } else {
        records.push({
          deviceId,
          temperature: null,
          humidity: null,
          moisture: null,
          light: null,
          timestamp: null,
          status: "warning",
        });
      }
    }

    res.json(records);
  } catch (err) {
    console.error("Influx multi-sensor error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========================
// SINGLE DEVICE
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
// DEVICE HISTORY
// ========================
router.get('/:deviceId/history', (req, res) => {
  const deviceId = req.params.deviceId;
  const field = req.query.field || 'temperature_c';
  const rangeParam = req.query.range || '24h';
  const aggregate = req.query.aggregate || (
    rangeParam === "24h" ? "10m" :
    rangeParam === "7d" ? "1h" :
    rangeParam === "30d" ? "6h" :
    "12h"
  );
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
// CHATBOT
// ========================
router.get("/:deviceId/chat", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const message = String(req.query.message || "").trim();
    if (!message) {
      return res.status(400).json({
        reply: "Use ?message=your question to test chat in browser.",
        example: `/api/sensors/${deviceId}/chat?message=Is%20soil%20moisture%20okay%20today%3F`,
      });
    }

    const result = await generateChatReply(deviceId, message, []);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("Chat GET error:", err);
    return res.status(503).json({ reply: "AI is temporarily unavailable. Please try again in a moment." });
  }
});

router.post("/:deviceId/chat", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { message, conversation } = req.body;
    const result = await generateChatReply(deviceId, message, conversation);
    return res.status(result.status).json(result.body);

  } catch (err) {
    console.error("Chat error:", err);
    return res.status(503).json({ reply: "AI is temporarily unavailable. Please try again in a moment." });
  }
});

module.exports = router;
