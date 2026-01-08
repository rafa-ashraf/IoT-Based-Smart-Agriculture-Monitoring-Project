const mqtt = require('mqtt')
const client = mqtt.connect('mqtt://broker.hivemq.com')

client.on('connect', () => {
  client.subscribe('AM03/sensors', (err) => {
    if (!err) console.log('Subscribed successfully')
  })
})

client.on('message', (topic, message) => {
  console.log(`Received on ${topic}: ${message.toString()}`)
})
