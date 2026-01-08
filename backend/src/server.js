require('dotenv').config()

const express = require('express')
const cors = require('cors')

// MQTT runs once on startup
const mqttClient = require('./mqtt/mqttClient')

const sensorRoutes = require('./api/sensorRoutes.js')

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/sensors', sensorRoutes)

const PORT = process.env.PORT || 5001
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`)
})
