const express = require('express')
require('express-async-errors')
const cors = require('cors')
const config = require('../config')
const routes = require('./routes')
const dgraph = require('../db/dgraph')

const app = express()

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

app.use(cors())
app.options('*', cors())

app.use('/api', routes)

app.all('*', (req, res) => {
  res.status(404)
  res.send(`${req.method} ${req.path} does not exist`)
})

app.use((err, req, res, next) => {
  const message = err.message || 'unknown error'
  console.error(`Error: ${message}`, err)
  res.status(500)
  res.send(message)
})

app.get('/', (req, res) => {
  res.send('Hello World!')
})

const server = app.listen(config.SERVER_PORT, () => {
  console.log(`App listening on port ${config.SERVER_PORT}`)
})

function shutdown() {
  server.close(() => {
    dgraph.close()
    process.exit(0)
  })

  setTimeout(() => {
    console.error('could not shut down in time')
    process.exit(1)
  }, 5000)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
