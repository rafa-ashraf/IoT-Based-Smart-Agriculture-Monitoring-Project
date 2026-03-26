const { InfluxDB, Point } = require('@influxdata/influxdb-client')

const influxDB = new InfluxDB({
  url: process.env.INFLUXDB_URL,
  token: process.env.INFLUXDB_TOKEN
})

const writeApi = influxDB.getWriteApi(
  process.env.ORG,
  process.env.BUCKET,
  'ns'
)

function writeSensorData(data) {
  if (
    typeof data.device_id !== 'string' ||
    typeof data.uptime_s !== 'number' ||
    typeof data.wifi_rssi_dbm !== 'number' ||
    typeof data.temperature_c !== 'number' ||
    typeof data.humidity_pct !== 'number' ||
    typeof data.pressure_pa !== 'number'
  ) {
    console.warn('⚠️ Invalid sensor payload:', data)
    return
  }

  const point = new Point('agri_telemetry')
    .tag('device_id', data.device_id)
    .intField('uptime_s', data.uptime_s)
    .intField('wifi_rssi_dbm', data.wifi_rssi_dbm)
    .floatField('temperature_c', data.temperature_c)
    .floatField('humidity_pct', data.humidity_pct)
    .floatField('pressure_pa', data.pressure_pa)
    .timestamp(new Date())

  if (typeof data.soil_moisture_pct === 'number') {
    point.floatField('soil_moisture_pct', data.soil_moisture_pct)
  }

  if (typeof data.light_raw === 'number') {
    point.floatField('light_raw', data.light_raw)
  }

  writeApi.writePoint(point)
}

// Flush once on shutdown
process.on('SIGINT', async () => {
  await writeApi.close()
  console.log('🧹 InfluxDB flushed')
  process.exit(0)
})

module.exports = { writeSensorData }