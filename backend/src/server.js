require('dotenv').config()
require('./mqtt/mqtt-to-influx')

const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 5001

const geminiRoutes = require('./api/geminiRoutes');
const sensorRoutes = require('./api/sensorRoutes'); 

app.use('/api/ai', geminiRoutes);
app.use('/api/sensors', sensorRoutes); 

app.get('/', (req, res) => {
  res.send('Backend is running')
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})