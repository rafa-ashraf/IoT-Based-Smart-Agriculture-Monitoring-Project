const express = require('express');
const router = express.Router();
const { InfluxDB } = require('@influxdata/influxdb-client');

// Initialize InfluxDB client
const influxDB = new InfluxDB({
  url: process.env.INFLUXDB_URL,
  token: process.env.INFLUXDB_TOKEN
});

const queryApi = influxDB.getQueryApi(process.env.ORG);
const BUCKET = process.env.BUCKET;

// ------------------------
// Helper functions
// ------------------------

// Get latest value for a given field
function queryLatest(field, res) {
  const query = `
    from(bucket: "${BUCKET}")
      |> range(start: 0)
      |> filter(fn: (r) => r._field == "${field}")
      |> last()
  `;

  let sent = null;

  queryApi.queryRows(query, {
    next(row, tableMeta) {
      const o = tableMeta.toObject(row);
      if (!sent) {
        sent = true;
        res.json({ field: o._field, value: o._value, timestamp: o._time });
      }
    },
    error(err) {
      console.error('InfluxDB query error:', err);
      if (!sent) res.status(500).json({ error: err.message });
    },
    complete() {
      if (!sent) res.status(404).json({ error: 'No data found' });
    }
  });
}

// Get history for a given field (last 24h)
function queryHistory(field, res) {
  const query = `
    from(bucket: "${BUCKET}")
      |> range(start: -24h)
      |> filter(fn: (r) => r._field == "${field}")
      |> sort(columns: ["_time"], desc: false)
  `;

  const results = [];

  queryApi.queryRows(query, {
    next(row, tableMeta) {
      const o = tableMeta.toObject(row);
      results.push({ value: o._value, timestamp: o._time });
    },
    error(err) {
      console.error('InfluxDB query error:', err);
      res.status(500).json({ error: err.message });
    },
    complete() {
      res.json(results);
    }
  });
}

// ------------------------
// Routes
// ------------------------

// Latest values
router.get('/temperature', (req, res) => queryLatest('temperature', res));
router.get('/humidity', (req, res) => queryLatest('humidity', res));
router.get('/moisture', (req, res) => queryLatest('soil_moisture', res));

// History (last 24h)
router.get('/temperature/history', (req, res) => queryHistory('temperature', res));
router.get('/humidity/history', (req, res) => queryHistory('humidity', res));
router.get('/moisture/history', (req, res) => queryHistory('soil_moisture', res));

module.exports = router;
