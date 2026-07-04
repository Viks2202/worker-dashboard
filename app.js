require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const connectDB = require('./src/config/db')

const eventRoutes = require('./src/routes/event.routes')
const metricsRoutes = require('./src/routes/metrics.routes')
const seedRoutes = require('./src/routes/seed.routes')
const Worker = require('./src/models/worker.model')
const Workstation = require('./src/models/workstation.model')

const app = express()

connectDB()

app.use(helmet())
app.use(cors({ origin: '*' }))
app.use(express.json())
app.use(morgan('dev'))

// Routes
app.use('/api/events', eventRoutes)
app.use('/api/metrics', metricsRoutes)
app.use('/api/seed', seedRoutes)

// Workers and workstations list endpoints
app.get('/api/workers', async (req, res) => {
  const workers = await Worker.find().sort({ worker_id: 1 })
  res.json({ success: true, workers })
})

app.get('/api/workstations', async (req, res) => {
  const stations = await Workstation.find().sort({ station_id: 1 })
  res.json({ success: true, workstations: stations })
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Auto-seed if DB is empty on first run
async function autoSeed() {
  try {
    const count = await Worker.countDocuments()
    if (count === 0) {
      console.log('No data found, auto-seeding...')
      const seedController = require('./src/controllers/seed.controller')
      const fakeReq = { body: { clear: true, days: 1 } }
      const fakeRes = {
        json: (data) => console.log('Auto-seed complete:', data)
      }
      await seedController.reseed(fakeReq, fakeRes, (err) => {
        if (err) console.error('Auto-seed error:', err)
      })
    }
  } catch (err) {
    console.error('Auto-seed check failed:', err.message)
  }
}

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.message)
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error'
  })
})

const PORT = process.env.PORT || 8000
app.listen(PORT, async () => {
  console.log(`Backend running on port ${PORT}`)
  setTimeout(autoSeed, 2000) // wait for DB connection before seeding
})