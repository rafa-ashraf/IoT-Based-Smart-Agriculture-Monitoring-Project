const express = require('express');
const router = express.Router();
const { InfluxDB } = require('@influxdata/influxdb-client');
const { GoogleGenAI } = require("@google/genai");

// Initialize InfluxDB client
const influxDB = new InfluxDB({
  url: process.env.INFLUXDB_URL,
  token: process.env.INFLUXDB_TOKEN
});

const queryApi = influxDB.getQueryApi(process.env.ORG);
const BUCKET = process.env.BUCKET;

// helper: convert range
function getRange(range) {
  switch (range) {
    case "7d": return "-7d";
    case "1m": return "-30d";
    default: return "-24h";
  }
}
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

// ========================
// GET latest sensor data
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
  
      console.log("DEBUG values:", o); //debug for testing

      result = {
        temperature: o.temperature_c,
        humidity: o.humidity_pct,
        moisture: o.soil_moisture_pct,
        light: o.light_raw
      };
    },
    error(err) {
      console.error('InfluxDB error:', err);
      res.status(500).json({ error: err.message });
    },
    complete() {
      // simple status logic
      let status = "optimal";
      if (result.moisture !== undefined && result.moisture < 20) status = "critical";
      else if (result.temperature !== undefined && result.temperature > 35) status = "warning";

      res.json({
        deviceId,
        ...result,
        status
      });
    }
  });
});

// ========================
// GET sensor history (dynamic)
// Example: /api/sensors/esp32_node_01/history?field=humidity_pct&range=7d&aggregate=1h
// ------------------------
router.get('/:deviceId/history', (req, res) => {
  const deviceId = req.params.deviceId;
  const field = req.query.field || 'temperature_c';
  const rangeParam = req.query.range || '24h';
  const aggregate = req.query.aggregate || (rangeParam === "24h" ? "10m" : "1h");

  const startRange = getRange(rangeParam);

  let query = `
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
      console.error('InfluxDB error:', err);
      res.status(500).json({ error: err.message });
    },
    complete() {
      res.json(results);
    }
  });
});

/* const { analyzeSensorData } = require("../services/geminiService");

router.get('/:deviceId/ai', async (req, res) => {
  try {
    const deviceId = req.params.deviceId;

    // reuse your existing latest query logic
    const sensorData = await getLatestSensorData(deviceId); // extract this into a helper

    const aiResponse = await analyzeSensorData(sensorData);

    res.json({
      deviceId,
      ...sensorData,
      ai: aiResponse
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI analysis failed" });
  }
});*/

// ========================
// GET AI insights
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
        light: o.light_raw
      };
    },

    async complete() {
      try {
        if (!sensorData) {
          return res.status(404).json({ error: "No sensor data found" });
        }
/*if (sensorData.moisture > 95) {
  return res.json({
    deviceId,
    ...sensorData,
    ai: "Soil moisture is already very high. No irrigation needed."
  });
}*/
        const prompt = `
You are an agricultural expert. Analyze this sensor data:

Sensor data:
- Temperature: ${sensorData.temperature} °C
- Humidity: ${sensorData.humidity} %
- Soil Moisture: ${sensorData.moisture} %
- Light: ${sensorData.light}

Return JSON ONLY in this format:
{
  "status": "optimal|warning|critical",
  "reason": "<short explanation>",
  "action": "<actionable recommendation>"
}
`;

        const result = await genAI.models.generateContent({
           model: "gemini-2.5-flash",
            contents: prompt,
  });

        const aiText = result.output_text || result.output?.[0]?.content || "";

        let aiJson;
        try {
          aiJson = JSON.parse(aiText);
        } catch {
          aiJson = {
            status: "unknown",
            reason: aiText,
            action: "Check system manually"
          };
        }

        // Map status to severity for alerts
        const severityMap = {
          optimal: "low",
          warning: "medium",
          critical: "critical",
          unknown: "medium"
        };

        res.json({
          deviceId,
          ...sensorData,
          ai: aiJson,
          aiAlert: {
            id: `ai-${Date.now()}`,
            message: `${aiJson.reason} | Action: ${aiJson.action}`,
            severity: severityMap[aiJson.status] || "medium",
            zoneId: deviceId,
            timestamp: new Date().toISOString()
          }
        });
      } catch (err) {
        console.error("AI ERROR:", err);
        // FALLBACK RESPONSE (IMPORTANT)
    res.json({
      deviceId,
      ...sensorData,
                ai: { status: "unknown", reason: "AI unavailable", action: "Check manually" },
          aiAlert: {
            id: `ai-${Date.now()}`,
            message: "AI temporarily unavailable. Check manually.",
            severity: "medium",
            zoneId: deviceId,
            timestamp: new Date().toISOString()
          }
        });
      }
    },

    error(err) {
      console.error("Influx ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  });
});
module.exports = router;