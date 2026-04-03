require('dotenv').config()

const mqtt = require('mqtt')
const { InfluxDB, Point } = require('@influxdata/influxdb-client')

// --- 1) InfluxDB configuration ---
const INFLUXDB_URL = process.env.INFLUXDB_URL
const INFLUXDB_TOKEN = process.env.INFLUXDB_TOKEN
const ORG = process.env.ORG
const BUCKET = process.env.BUCKET

const influxDB = new InfluxDB({ url: INFLUXDB_URL, token: INFLUXDB_TOKEN })
const writeApi = influxDB.getWriteApi(ORG, BUCKET)
writeApi.useDefaultTags({ location: 'AM03' })

// --- 2) MQTT configuration ---
const MQTT_BROKER = process.env.MQTT_BROKER
const TOPIC = process.env.MQTT_TOPIC

const client = mqtt.connect(MQTT_BROKER)

client.on('connect', () => {
  console.log(`Connected to MQTT broker: ${MQTT_BROKER}`)
  client.subscribe(TOPIC, (err) => {
    if (err) {
      console.error('Failed to subscribe:', err)
    } else {
      console.log(`Subscribed to topic: ${TOPIC}`)
    }
  })
})

// --- 3) Handle incoming messages ---
client.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString())
    console.log(`Received on ${topic}:`, data)

    // Basic validation
    if (
      !data.device_id ||
      data.uptime_s === undefined ||
      data.wifi_rssi_dbm === undefined ||
      data.temperature_c === undefined ||
      data.humidity_pct === undefined ||
      data.pressure_pa === undefined
    ) {
      console.warn('Invalid sensor payload:', data)
      return
    }

    // --- 4) Write to InfluxDB ---
    const point = new Point('agri_telemetry')
      .tag('device_id', String(data.device_id))
      .intField('uptime_s', Number(data.uptime_s))
      .intField('wifi_rssi_dbm', Number(data.wifi_rssi_dbm))
      .floatField('temperature_c', Number(data.temperature_c))
      .floatField('humidity_pct', Number(data.humidity_pct))
      .floatField('pressure_pa', Number(data.pressure_pa))
      .timestamp(new Date())

    if (data.soil_moisture_pct !== undefined && data.soil_moisture_pct !== null) {
      point.floatField('soil_moisture_pct', Number(data.soil_moisture_pct))
    }

    if (data.light_raw !== undefined && data.light_raw !== null) {
      point.floatField('light_raw', Number(data.light_raw))
    }

    writeApi.writePoint(point)
  } catch (err) {
    console.error('Error parsing MQTT message:', err)
  }
})

// --- 5) Handle shutdown cleanly ---
process.on('SIGINT', () => {
  console.log('Closing InfluxDB writeApi...')
  writeApi
    .close()
    .then(() => {
      console.log('Influx writeApi closed')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Error closing writeApi:', err)
      process.exit(1)
    })
})