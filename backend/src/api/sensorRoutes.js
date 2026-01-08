const express = require('express')
const router = express.Router()
const { InfluxDB } = require('@influxdata/influxdb-client')

router.get('/latest', async (req, res) => {
  const influxDB = new InfluxDB({
    url: process.env.INFLUXDB_URL,
    token: process.env.INFLUXDB_TOKEN
  })

  const queryApi = influxDB.getQueryApi(process.env.ORG)

  const query = `
    from(bucket: "${process.env.BUCKET}")
      |> range(start: -1h)
      |> last()
  `

  const result = {}

  queryApi.queryRows(query, {
    next(row, tableMeta) {
      const o = tableMeta.toObject(row)
      result[o._field] = o._value
      result.timestamp = o._time
    },
    complete() {
      res.json(result)
    },
    error(err) {
      console.error(err)
      res.status(500).json({ error: err.message })
    }
  })
})

module.exports = router


