const mqtt = require('mqtt')

const client = mqtt.connect('mqtt://broker.hivemq.com')

client.on('connect', () => {
  client.publish(
    'AM03/sensors',
    JSON.stringify({
      temperature: 75,
      humidity: 39,
      soil_moisture: 82
    })
  )

  console.log('Test MQTT message sent')
  client.end()
})
