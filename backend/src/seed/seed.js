const mongoose = require('mongoose')
require('dotenv').config({ path: '../.env' })

const Worker = require('../models/worker.model')
const Workstation = require('../models/workstation.model')
const Event = require('../models/event.model')
const crypto = require('crypto')

const WORKERS = [
  { worker_id: 'W1', name: 'Rajesh Kumar', department: 'Assembly', shift: 'Morning' },
  { worker_id: 'W2', name: 'Priya Sharma', department: 'Assembly', shift: 'Morning' },
  { worker_id: 'W3', name: 'Amit Singh', department: 'Packaging', shift: 'Morning' },
  { worker_id: 'W4', name: 'Sunita Patel', department: 'Quality', shift: 'Morning' },
  { worker_id: 'W5', name: 'Rahul Verma', department: 'Assembly', shift: 'Afternoon' },
  { worker_id: 'W6', name: 'Meena Joshi', department: 'Packaging', shift: 'Afternoon' }
]

const WORKSTATIONS = [
  { station_id: 'S1', name: 'Assembly Line 1', type: 'Assembly', location: 'Floor A' },
  { station_id: 'S2', name: 'Assembly Line 2', type: 'Assembly', location: 'Floor A' },
  { station_id: 'S3', name: 'Packaging Unit 1', type: 'Packaging', location: 'Floor B' },
  { station_id: 'S4', name: 'Packaging Unit 2', type: 'Packaging', location: 'Floor B' },
  { station_id: 'S5', name: 'Quality Check 1', type: 'Quality', location: 'Floor C' },
  { station_id: 'S6', name: 'Quality Check 2', type: 'Quality', location: 'Floor C' }
]

function generateHash(event) {
  const str = `${event.timestamp}-${event.worker_id}-${event.workstation_id}-${event.event_type}`
  return crypto.createHash('md5').update(str).digest('hex')
}

function generateEvents() {
  const events = []
  const now = new Date()
  // Generate 8 hours of events for today
  const shiftStart = new Date(now)
  shiftStart.setHours(8, 0, 0, 0)

  const workers = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6']
  const stations = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']

  // Event patterns per worker (realistic simulation)
  const patterns = [
    // W1 — high performer
    { working: 0.75, idle: 0.15, absent: 0.10 },
    // W2 — average
    { working: 0.60, idle: 0.25, absent: 0.15 },
    // W3 — above average
    { working: 0.70, idle: 0.20, absent: 0.10 },
    // W4 — average
    { working: 0.55, idle: 0.30, absent: 0.15 },
    // W5 — high performer
    { working: 0.80, idle: 0.15, absent: 0.05 },
    // W6 — below average
    { working: 0.45, idle: 0.35, absent: 0.20 }
  ]

  workers.forEach((workerId, wIdx) => {
    const stationId = stations[wIdx]
    const pattern = patterns[wIdx]
    let currentTime = new Date(shiftStart)

    // Generate events every 15 minutes for 8 hours (32 events per worker)
    for (let i = 0; i < 32; i++) {
      const rand = Math.random()
      let eventType

      if (rand < pattern.working) eventType = 'working'
      else if (rand < pattern.working + pattern.idle) eventType = 'idle'
      else eventType = 'absent'

      const event = {
        timestamp: new Date(currentTime),
        worker_id: workerId,
        workstation_id: stationId,
        event_type: eventType,
        confidence: 0.85 + Math.random() * 0.15,
        count: 0
      }
      event.event_hash = generateHash(event)
      events.push(event)

      // Add product_count event after every working event
      if (eventType === 'working') {
        const productEvent = {
          timestamp: new Date(currentTime.getTime() + 60000), // 1 min later
          worker_id: workerId,
          workstation_id: stationId,
          event_type: 'product_count',
          confidence: 0.99,
          count: Math.floor(2 + Math.random() * 8) // 2-9 units per 15-min window
        }
        productEvent.event_hash = generateHash(productEvent)
        events.push(productEvent)
      }

      currentTime = new Date(currentTime.getTime() + 15 * 60 * 1000) // +15 min
    }
  })

  // Sort by timestamp
  return events.sort((a, b) => a.timestamp - b.timestamp)
}

async function seed(clearFirst = true) {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')

    if (clearFirst) {
      await Worker.deleteMany({})
      await Workstation.deleteMany({})
      await Event.deleteMany({})
      console.log('Cleared existing data')
    }

    // Insert workers and workstations
    await Worker.insertMany(WORKERS)
    await Workstation.insertMany(WORKSTATIONS)
    console.log('Workers and workstations seeded')

    // Insert events (ignore duplicates via upsert)
    const events = generateEvents()
    let inserted = 0
    let skipped = 0

    for (const event of events) {
      try {
        await Event.create(event)
        inserted++
      } catch (err) {
        if (err.code === 11000) skipped++ // duplicate
        else throw err
      }
    }

    console.log(`Events seeded: ${inserted} inserted, ${skipped} duplicates skipped`)
    console.log('Seed complete!')
    process.exit(0)
  } catch (err) {
    console.error('Seed error:', err.message)
    process.exit(1)
  }
}

seed()