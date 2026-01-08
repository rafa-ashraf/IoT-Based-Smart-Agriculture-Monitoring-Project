// mqtt-to-influx.js
const mqtt = require('mqtt')
const { InfluxDB, Point } = require('@influxdata/influxdb-client')

// --- 1️⃣ InfluxDB configuration ---
const INFLUXDB_URL = 'http://localhost:8086' // change if remote
const INFLUXDB_TOKEN = 'zgqzbelOHiSQ2UZoyky3Y56iqWNd60EUrWaic5pIpGep68KgKFU038LtpY6ysBmqfamUx731zySm0GDTkHVgOw=='
const ORG = 'TMU'
const BUCKET = 'iot_data'

const influxDB = new InfluxDB({ url: INFLUXDB_URL, token: INFLUXDB_TOKEN })
const writeApi = influxDB.getWriteApi(ORG, BUCKET)
writeApi.useDefaultTags({ location: 'AM03' }) // optional

// --- 2️⃣ MQTT configuration ---
const MQTT_BROKER = 'mqtt://broker.hivemq.com'
const TOPIC = 'AM03/sensors'

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

// --- 3️⃣ Handle incoming messages ---
client.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString())
    console.log(`Received on ${topic}:`, data)

    // --- 4️⃣ Write to InfluxDB ---
    const point = new Point('sensors')
      .floatField('temperature', data.temperature)
      .floatField('humidity', data.humidity)
      .floatField('soil_moisture', data.soil_moisture)
      .timestamp(new Date()) // use current timestamp

    writeApi.writePoint(point)
    writeApi
      .flush()
      .then(() => console.log('Point written to InfluxDB'))
      .catch((err) => console.error('Error writing point:', err))
  } catch (err) {
    console.error('Error parsing MQTT message:', err)
  }
})

// --- 5️⃣ Handle connection errors ---
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
