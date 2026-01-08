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
    typeof data.temperature !== 'number' ||
    typeof data.humidity !== 'number' ||
    typeof data.soil_moisture !== 'number'
  ) {
    console.warn('⚠️ Invalid sensor payload:', data)
    return
  }

  const point = new Point('sensors')
    .floatField('temperature', data.temperature)
    .floatField('humidity', data.humidity)
    .intField('soil_moisture', data.soil_moisture)
    .timestamp(new Date())

  writeApi.writePoint(point)
}

// Flush once on shutdown
process.on('SIGINT', async () => {
  await writeApi.close()
  console.log('🧹 InfluxDB flushed')
  process.exit(0)
})

module.exports = { writeSensorData }
