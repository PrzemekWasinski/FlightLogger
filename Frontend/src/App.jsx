import { useState, useEffect } from 'react'
import { Plane, Plus, Edit2, Trash2, X, TrendingUp, Globe, Calendar, BarChart3 } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const API_BASE = 'http://localhost:8080/flights'

function App() {
  const [flights, setFlights] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAllFlights, setShowAllFlights] = useState(false)
  const [editingFlight, setEditingFlight] = useState(null)
  const [formData, setFormData] = useState({
    date: '',
    planeManufacturer: '',
    planeModel: '',
    planeRegistration: '',
    special: '',
    airline: '',
    airlineClass: '',
    flightNumber: '',
    cruisingAltitude: '',
    depAirport: '',
    arrAirport: ''
  })

  useEffect(() => {
    fetchFlights()
  }, [])

  const fetchFlights = async () => {
    try {
      const res = await fetch(`${API_BASE}/all`)
      const data = await res.json()
      setFlights(data)
    } catch (err) {
      console.error('Error fetching flights:', err)
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingFlight) {
        await fetch(`${API_BASE}/update/${editingFlight.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
      } else {
        await fetch(`${API_BASE}/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
      }
      fetchFlights()
      closeModal()
    } catch (err) {
      console.error('Error saving flight:', err)
    }
  }

  const deleteFlight = async (flight) => {
    if (!window.confirm('Delete this flight?')) return
    try {
      await fetch(`${API_BASE}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flight)
      })
      fetchFlights()
    } catch (err) {
      console.error('Error deleting flight:', err)
    }
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingFlight(null)
    setFormData({
      date: '',
      planeManufacturer: '',
      planeModel: '',
      planeRegistration: '',
      special: '',
      airline: '',
      airlineClass: '',
      flightNumber: '',
      cruisingAltitude: '',
      depAirport: '',
      arrAirport: ''
    })
  }

  const openEditModal = (flight) => {
    setEditingFlight(flight)
    setFormData(flight)
    setShowAddModal(true)
  }

  const getStats = () => {
    const airlines = {}
    const airports = {}
    const planeModels = {}
    const routes = {}
    const manufacturers = {}
    const monthlyFlights = {}
    const currentYear = new Date().getFullYear()
    
    flights.forEach(f => {
      // Airlines
      airlines[f.airline] = (airlines[f.airline] || 0) + 1
      
      // Airports (both departure and arrival)
      airports[f.depAirport] = (airports[f.depAirport] || 0) + 1
      airports[f.arrAirport] = (airports[f.arrAirport] || 0) + 1
      
      // Plane models (manufacturer + model combined)
      const planeModel = `${f.planeManufacturer} ${f.planeModel}`.trim()
      if (planeModel) {
        planeModels[planeModel] = (planeModels[planeModel] || 0) + 1
      }
      
      // Routes (departure → arrival)
      const route = `${f.depAirport} → ${f.arrAirport}`
      routes[route] = (routes[route] || 0) + 1
      
      // Manufacturers for chart
      manufacturers[f.planeManufacturer] = (manufacturers[f.planeManufacturer] || 0) + 1
      
      // Monthly flights
      const date = new Date(f.date)
      if (date.getFullYear() === currentYear) {
        const month = date.toLocaleDateString('en', { month: 'short' })
        monthlyFlights[month] = (monthlyFlights[month] || 0) + 1
      }
    })

    const flightsThisYear = flights.filter(f => 
      new Date(f.date).getFullYear() === currentYear
    ).length

    // Get top 3 airlines
    const topAirlines = Object.entries(airlines)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }))

    // Get top 3 airports
    const topAirports = Object.entries(airports)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }))

    // Get top 3 plane models
    const topPlaneModels = Object.entries(planeModels)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }))

    // Get top 3 routes
    const topRoutes = Object.entries(routes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }))

    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthlyData = monthOrder.map(month => ({
      month,
      flights: monthlyFlights[month] || 0
    }))

    const airlineData = Object.entries(airlines)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))

    const manufacturerData = Object.entries(manufacturers)
      .map(([name, value]) => ({ name, value }))

    return {
      total: flights.length,
      topAirlines,
      topAirports,
      topPlaneModels,
      topRoutes,
      flightsThisYear,
      uniqueAirlines: Object.keys(airlines).length,
      uniqueAirports: Object.keys(airports).length,
      monthlyData,
      airlineData,
      manufacturerData
    }
  }

  const stats = getStats()

  const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-slate-900 text-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div 
            onClick={() => setShowAllFlights(false)}
            className="cursor-pointer inline-block"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2 flex flex-wrap items-center gap-4 pb-2">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-2xl shadow-lg shadow-blue-500/30">
                <Plane className="text-white" size={40} />
              </div>
              <span>Flight Logger</span>
            </h1>
          </div>
        </div>

        {!showAllFlights ? (
          <>
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard 
                title="Total Flights" 
                value={stats.total} 
                icon={<Plane size={24} />}
              />
              <StatCard 
                title="This Year" 
                value={stats.flightsThisYear}
                icon={<Calendar size={24} />}
              />
              <StatCard 
                title="Airlines" 
                value={stats.uniqueAirlines}
                icon={<Globe size={24} />}
              />
              <StatCard 
                title="Airports" 
                value={stats.uniqueAirports}
                icon={<TrendingUp size={24} />}
              />
            </div>
            

            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <TopStatCard 
                title="Most Frequent Airlines"
                items={stats.topAirlines}
              />
              <TopStatCard 
                title="Most Visited Airports"
                items={stats.topAirports}
              />
              <TopStatCard 
                title="Most Common Aircraft"
                items={stats.topPlaneModels}
              />
              <TopStatCard 
                title="Most Common Routes"
                items={stats.topRoutes}
              />
            </div>

            <br></br>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <button
                onClick={() => setShowAddModal(true)}
                className="relative bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl hover:shadow-blue-500/20 hover:border-blue-600/50 transition-all duration-300 hover:scale-105"
              >
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="bg-blue-700 p-6 rounded-2xl transition-transform">
                    <Plus size={48} className="text-white" />
                  </div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Add New Flight</span>
                </div>
              </button>

              <button
                onClick={() => setShowAllFlights(true)}
                className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl hover:shadow-blue-500/20 hover:border-blue-600/50 transition-all duration-300 hover:scale-105"
              >
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="bg-blue-700 p-6 rounded-2xl transition-transform">
                    <BarChart3 size={48} className="text-white" />
                  </div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">View All Flights</span>
                </div>
              </button>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Monthly Flights Chart */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-6 shadow-2xl">
                <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Monthly Flight Activity</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                      labelStyle={{ color: '#f1f5f9' }}
                    />
                    <Line type="monotone" dataKey="flights" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Top Airlines Chart */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl">
                <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Top Airlines</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.airlineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                      labelStyle={{ color: '#f1f5f9' }}
                      cursor={false}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Aircraft Manufacturers */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-6 shadow-2xl lg:col-span-2">
                <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Aircraft Manufacturers</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.manufacturerData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.manufacturerData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white">All Flights</h2>
              <button
                onClick={() => setShowAllFlights(false)}
                className="bg-slate-800 text-white px-6 py-3 rounded-xl hover:bg-slate-700 transition-all shadow-lg"
              >
                Back to Dashboard
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr className="border-b border-slate-700">
                    <th className="p-4 text-left text-blue-400 font-semibold">Date</th>
                    <th className="p-4 text-left text-blue-400 font-semibold">Flight</th>
                    <th className="p-4 text-left text-blue-400 font-semibold">Route</th>
                    <th className="p-4 text-left text-blue-400 font-semibold">Aircraft</th>
                    <th className="p-4 text-left text-blue-400 font-semibold">Airline</th>
                    <th className="p-4 text-left text-blue-400 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flights.map((flight, idx) => (
                    <tr key={flight.id} className="border-b border-slate-800 hover:bg-slate-800 transition-colors">
                      <td className="p-4">{flight.date}</td>
                      <td className="p-4 font-semibold text-blue-400">{flight.flightNumber}</td>
                      <td className="p-4">{flight.depAirport} → {flight.arrAirport}</td>
                      <td className="p-4">{flight.planeManufacturer} {flight.planeModel}</td>
                      <td className="p-4">{flight.airline}</td>
                      <td className="p-4 flex gap-3">
                        <button
                          onClick={() => openEditModal(flight)}
                          className="text-blue-400 hover:text-blue-300 transition-colors hover:scale-110 transform"
                        >
                          <Edit2 size={20} />
                        </button>
                        <button
                          onClick={() => deleteFlight(flight)}
                          className="text-red-400 hover:text-red-300 transition-colors hover:scale-110 transform"
                        >
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-bold text-white">
                    {editingFlight ? 'Edit Flight' : 'Add New Flight'}
                  </h2>
                  <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors hover:rotate-90 transform duration-300">
                    <X size={28} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="date"
                    placeholder="Date"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="col-span-full p-4 border border-slate-700 bg-slate-800 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Flight Number"
                    value={formData.flightNumber}
                    onChange={e => setFormData({...formData, flightNumber: e.target.value})}
                    className="p-4 border border-slate-700 bg-slate-800 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Airline"
                    value={formData.airline}
                    onChange={e => setFormData({...formData, airline: e.target.value})}
                    className="p-4 border border-slate-700 bg-slate-800 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Departure Airport"
                    value={formData.depAirport}
                    onChange={e => setFormData({...formData, depAirport: e.target.value})}
                    className="p-4 border border-slate-700 bg-slate-800 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Arrival Airport"
                    value={formData.arrAirport}
                    onChange={e => setFormData({...formData, arrAirport: e.target.value})}
                    className="p-4 border border-slate-700 bg-slate-800 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Plane Manufacturer"
                    value={formData.planeManufacturer}
                    onChange={e => setFormData({...formData, planeManufacturer: e.target.value})}
                    className="p-4 border border-slate-700 bg-slate-800 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Plane Model"
                    value={formData.planeModel}
                    onChange={e => setFormData({...formData, planeModel: e.target.value})}
                    className="p-4 border border-slate-700 bg-slate-800 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Registration"
                    value={formData.planeRegistration}
                    onChange={e => setFormData({...formData, planeRegistration: e.target.value})}
                    className="p-4 border border-slate-700 bg-slate-800 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Class"
                    value={formData.airlineClass}
                    onChange={e => setFormData({...formData, airlineClass: e.target.value})}
                    className="p-4 border border-slate-700 bg-slate-800 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <input
                    type="number"
                    placeholder="Cruising Altitude"
                    value={formData.cruisingAltitude}
                    onChange={e => setFormData({...formData, cruisingAltitude: e.target.value})}
                    className="p-4 border border-slate-700 bg-slate-800 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Special Notes"
                    value={formData.special}
                    onChange={e => setFormData({...formData, special: e.target.value})}
                    className="col-span-full p-4 border border-slate-700 bg-slate-800 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <button
                    onClick={handleSubmit}
                    className="col-span-full bg-blue-700 text-white py-4 rounded-xl hover:bg-blue-600 transition-all font-bold text-lg shadow-lg hover:scale-105 transform"
                  >
                    {editingFlight ? 'Update Flight' : 'Add Flight'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, icon }) {
  return (
    <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
        <div className="text-blue-400 opacity-80">{icon}</div>
      </div>
      <p className="text-4xl font-black bg-gradient-to-br from-white to-blue-100 bg-clip-text text-transparent">{value}</p>
    </div>
  )
}

function TopStatCard({ title, items }) {
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
      <h3 className="text-gray-300 text-sm font-medium uppercase tracking-wider mb-4">{title}</h3>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center">
            <span className="text-white font-medium truncate pr-2">{item.name}</span>
            <span className="text-blue-400 font-bold text-lg">{item.count}</span>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-gray-500 text-sm">No data yet</div>
        )}
      </div>
    </div>
  )
}

export default App