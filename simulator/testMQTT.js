const mqtt = require('mqtt')

const client = mqtt.connect('mqtt://broker.hivemq.com')

client.on('connect', () => {
  client.publish(
    'AM03/sensors',
    JSON.stringify({
      temperature: 40,
      humidity: 80,
      soil_moisture: 500.2
    })
  )

  console.log('Test MQTT message sent')
  client.end()
})
