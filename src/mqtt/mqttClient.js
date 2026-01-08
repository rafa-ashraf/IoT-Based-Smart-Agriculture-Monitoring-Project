const mqtt = require('mqtt')
const { writeSensorData } = require('../influx/influxClient')

const client = mqtt.connect(process.env.MQTT_BROKER)

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker')
  console.log('📡 Subscribed to:', process.env.MQTT_TOPIC)
  client.subscribe(process.env.MQTT_TOPIC)
})

client.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString())
    console.log('📥 MQTT message:', data)
    writeSensorData(data)
  } catch (err) {
    console.error('❌ Invalid MQTT message:', message.toString())
  }
})
