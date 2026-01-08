require('dotenv').config()
const { writeSensorData } = require('./src/influx/influx')

writeSensorData({
  temperature: 25.1,
  humidity: 50.3,
  soil_moisture: 612
})

console.log('Test write sent')
