const mongoose = require('mongoose')

const workerSchema = new mongoose.Schema({
  worker_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  department: { type: String, default: 'General' },
  shift: { type: String, default: 'Morning' }
}, { timestamps: true })

module.exports = mongoose.model('Worker', workerSchema)