import { useState, useEffect, useCallback } from 'react'
import { getMetrics, reseedData, ingestEvent } from './api/api'
import StatCard from './components/StatCard'
import WorkerTable from './components/WorkerTable'
import StationTable from './components/StationTable'
import DetailModal from './components/DetailModal'

export default function App() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [modal, setModal] = useState(null)
  const [seeding, setSeeding] = useState(false)
  const [filterWorker, setFilterWorker] = useState('')
  const [filterStation, setFilterStation] = useState('')

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getMetrics(selectedDate)
      setMetrics(res.data)
    } catch (err) {
      setError('Failed to load metrics. Make sure backend is running.')
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => { fetchMetrics() }, [fetchMetrics])

  async function handleReseed(clear = false) {
    if (!window.confirm(clear ? 'Clear all data and reseed?' : 'Add fresh seed data?')) return
    setSeeding(true)
    try {
      await reseedData({ clear, days: 1 })
      await fetchMetrics()
      alert('Data refreshed successfully!')
    } catch (err) {
      alert('Reseed failed: ' + err.message)
    } finally {
      setSeeding(false)
    }
  }

  async function handleIngestSample() {
    const event = {
      timestamp: new Date().toISOString(),
      worker_id: 'W1',
      workstation_id: 'S1',
      event_type: 'working',
      confidence: 0.95,
      count: 0
    }
    try {
      await ingestEvent(event)
      await fetchMetrics()
      alert('Sample event ingested!')
    } catch (err) {
      alert('Ingest failed: ' + err.message)
    }
  }

  const filteredWorkers = metrics?.workers?.filter(w =>
    !filterWorker || w.name.toLowerCase().includes(filterWorker.toLowerCase()) || w.worker_id === filterWorker
  ) || []

  const filteredStations = metrics?.workstations?.filter(s =>
    !filterStation || s.name.toLowerCase().includes(filterStation.toLowerCase()) || s.station_id === filterStation
  ) || []

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* NAVBAR */}
      <nav className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏭</span>
            <div>
              <h1 className="font-bold text-white text-sm">Worker Productivity Dashboard</h1>
              <p className="text-xs text-slate-400">AI-Powered CCTV Analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300"
            />
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
            >
              {loading ? '⟳ Loading...' : '↻ Refresh'}
            </button>
            <button
              onClick={() => handleReseed(false)}
              disabled={seeding}
              className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
            >
              + Add Data
            </button>
            <button
              onClick={() => handleReseed(true)}
              disabled={seeding}
              className="bg-red-900/60 hover:bg-red-800/60 text-red-300 text-xs px-3 py-1.5 rounded-lg font-medium"
            >
              ↺ Reseed
            </button>
            <button
              onClick={handleIngestSample}
              className="bg-green-900/60 hover:bg-green-800/60 text-green-300 text-xs px-3 py-1.5 rounded-lg font-medium"
            >
              ⚡ Ingest Event
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ERROR */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 mb-6 text-red-300 text-sm">
            ⚠ {error}
          </div>
        )}

        {/* FACTORY OVERVIEW */}
        {metrics?.factory && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              🏭 Factory Overview
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <StatCard title="Total Production" value={metrics.factory.total_production_count} unit="units" color="green" icon="📦" />
              <StatCard title="Productive Time" value={metrics.factory.total_productive_time_hours} unit="hrs" color="blue" icon="⏱" />
              <StatCard title="Avg Production Rate" value={metrics.factory.average_production_rate} unit="u/hr" color="amber" icon="⚡" />
              <StatCard title="Avg Utilization" value={`${metrics.factory.average_utilization_percent}%`} color="purple" icon="📊" />
              <StatCard title="Workers" value={metrics.factory.total_workers} color="blue" icon="👥" />
              <StatCard title="Workstations" value={metrics.factory.total_workstations} color="green" icon="🖥" />
              <StatCard title="Events Today" value={metrics.factory.total_events_today} color="amber" icon="📡" />
            </div>
          </div>
        )}

        {/* TABS */}
        <div className="flex gap-1 mb-6 bg-slate-900 rounded-xl p-1 w-fit">
          {['overview', 'workers', 'workstations'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'overview' ? '📊 Overview' : tab === 'workers' ? '👥 Workers' : '🏭 Workstations'}
            </button>
          ))}
        </div>

        {/* WORKERS TAB */}
        {(activeTab === 'workers' || activeTab === 'overview') && metrics?.workers && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                👥 Workers ({filteredWorkers.length})
              </h2>
              <input
                type="text"
                placeholder="Filter workers..."
                value={filterWorker}
                onChange={e => setFilterWorker(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 w-48"
              />
            </div>
            {loading ? (
              <div className="text-center text-slate-400 py-10">Loading workers...</div>
            ) : (
              <WorkerTable
                workers={filteredWorkers}
                onSelect={(id) => setModal({ type: 'worker', id })}
              />
            )}
          </div>
        )}

        {/* WORKSTATIONS TAB */}
        {(activeTab === 'workstations' || activeTab === 'overview') && metrics?.workstations && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                🏭 Workstations ({filteredStations.length})
              </h2>
              <input
                type="text"
                placeholder="Filter stations..."
                value={filterStation}
                onChange={e => setFilterStation(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 w-48"
              />
            </div>
            {loading ? (
              <div className="text-center text-slate-400 py-10">Loading workstations...</div>
            ) : (
              <StationTable
                stations={filteredStations}
                onSelect={(id) => setModal({ type: 'station', id })}
              />
            )}
          </div>
        )}
      </div>

      {/* MODAL */}
      {modal && (
        <DetailModal
          type={modal.type}
          id={modal.id}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}