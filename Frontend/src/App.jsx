import{useState,useEffect}from'react'
import{Plane,Plus,Edit2,Trash2,X,Calendar,BarChart3,MapPin,Building2}from'lucide-react'
import{LineChart,Line,BarChart,Bar,PieChart,Pie,Cell,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,Legend}from'recharts'
const API_BASE='http://localhost:8080/flights'
const COLORS=['#4a90e2','#5fb3b3','#7fb069','#d4a574','#9f7aea','#e06c75']
const emptyForm={date:'',planeManufacturer:'',planeModel:'',planeRegistration:'',special:'',airline:'',airlineClass:'',flightNumber:'',cruisingAltitude:'',depAirport:'',arrAirport:''}
function App(){
const[flights,setFlights]=useState([])
const[showAddModal,setShowAddModal]=useState(false)
const[showAllFlights,setShowAllFlights]=useState(false)
const[editingFlight,setEditingFlight]=useState(null)
const[formData,setFormData]=useState(emptyForm)
useEffect(()=>{fetchFlights()},[])
const fetchFlights=async()=>{try{const res=await fetch(`${API_BASE}/all`)
setFlights(await res.json())}catch(err){console.error('Error:',err)}}
const handleSubmit=async()=>{try{const url=editingFlight?`${API_BASE}/update/${editingFlight.id}`:`${API_BASE}/add`
const method=editingFlight?'PUT':'POST'
await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(formData)})
fetchFlights()
closeModal()}catch(err){console.error('Error:',err)}}
const deleteFlight=async(flight)=>{if(!window.confirm('Delete this flight?'))return
try{await fetch(`${API_BASE}/delete`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify(flight)})
fetchFlights()}catch(err){console.error('Error:',err)}}
const closeModal=()=>{setShowAddModal(false);setEditingFlight(null);setFormData(emptyForm)}
const openEditModal=(flight)=>{setEditingFlight(flight);setFormData(flight);setShowAddModal(true)}
const getStats=()=>{const airlines={},airports={},planeModels={},routes={},manufacturers={},monthlyFlights={}
const currentYear=new Date().getFullYear()
flights.forEach(f=>{airlines[f.airline]=(airlines[f.airline]||0)+1
airports[f.depAirport]=(airports[f.depAirport]||0)+1
airports[f.arrAirport]=(airports[f.arrAirport]||0)+1
const pm=`${f.planeManufacturer} ${f.planeModel}`.trim()
if(pm)planeModels[pm]=(planeModels[pm]||0)+1
routes[`${f.depAirport} → ${f.arrAirport}`]=(routes[`${f.depAirport} → ${f.arrAirport}`]||0)+1
manufacturers[f.planeManufacturer]=(manufacturers[f.planeManufacturer]||0)+1
const date=new Date(f.date)
if(date.getFullYear()===currentYear){const month=date.toLocaleDateString('en',{month:'short'})
monthlyFlights[month]=(monthlyFlights[month]||0)+1}})
const sortTop=(obj,n)=>Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([name,count])=>({name,count}))
const monthOrder=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
return{total:flights.length,topAirlines:sortTop(airlines,3),topAirports:sortTop(airports,3),topPlaneModels:sortTop(planeModels,3),topRoutes:sortTop(routes,3),flightsThisYear:flights.filter(f=>new Date(f.date).getFullYear()===currentYear).length,uniqueAirlines:Object.keys(airlines).length,uniqueAirports:Object.keys(airports).length,monthlyData:monthOrder.map(month=>({month,flights:monthlyFlights[month]||0})),airlineData:sortTop(airlines,5).map(({name,count})=>({name,value:count})),manufacturerData:Object.entries(manufacturers).map(([name,value])=>({name,value}))}}
const stats=getStats()
const inputClass="w-full px-4 py-3 bg-dark-850 border border-dark-700 text-neutral-100 placeholder-neutral-400 focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue transition-colors"
return(
<div className="min-h-screen bg-dark-950 text-neutral-100 font-sans">
<nav className="bg-dark-900 border-b border-dark-800 sticky top-0 z-40">
<div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
<div onClick={()=>setShowAllFlights(false)} className="flex items-center gap-3 cursor-pointer group">
<div className="bg-accent-blue p-2.5 group-hover:bg-accent-teal transition-colors">
<Plane className="text-white" size={24}/>
</div>
<div>
<h1 className="text-xl font-bold text-neutral-100">Flight Logger</h1>
<p className="text-xs text-neutral-400 font-mono">Aviation Tracking System</p>
</div>
</div>
<div className="flex items-center gap-3">
<button onClick={()=>setShowAddModal(true)} className="flex items-center gap-2 bg-accent-blue hover:bg-accent-teal text-white px-4 py-2 text-sm font-medium transition-colors">
<Plus size={18}/>
<span>Add Flight</span>
</button>
<button onClick={()=>setShowAllFlights(!showAllFlights)} className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 text-neutral-200 px-4 py-2 text-sm font-medium border border-dark-700 transition-colors">
<BarChart3 size={18}/>
<span>{showAllFlights?'Dashboard':'All Flights'}</span>
</button>
</div>
</div>
</nav>
<div className="max-w-[1600px] mx-auto px-6 py-8">
{!showAllFlights?(
<>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
<MetricCard title="Total Flights" value={stats.total} icon={<Plane size={20}/>} color="blue"/>
<MetricCard title="This Year" value={stats.flightsThisYear} icon={<Calendar size={20}/>} color="teal"/>
<MetricCard title="Airlines" value={stats.uniqueAirlines} icon={<Building2 size={20}/>} color="green"/>
<MetricCard title="Airports" value={stats.uniqueAirports} icon={<MapPin size={20}/>} color="amber"/>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
<TopListCard title="Top Airlines" items={stats.topAirlines}/>
<TopListCard title="Top Airports" items={stats.topAirports}/>
<TopListCard title="Common Aircraft" items={stats.topPlaneModels}/>
<TopListCard title="Popular Routes" items={stats.topRoutes}/>
</div>
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
<div className="lg:col-span-2 bg-dark-900 border border-dark-800 p-6">
<div className="flex items-center justify-between mb-6">
<h3 className="text-lg font-semibold text-neutral-100">Monthly Flight Activity</h3>
<span className="text-xs text-neutral-400 font-mono">{new Date().getFullYear()}</span>
</div>
<ResponsiveContainer width="100%" height={300}>
<LineChart data={stats.monthlyData}>
<CartesianGrid strokeDasharray="3 3" stroke="#1a2332" vertical={false}/>
<XAxis dataKey="month" stroke="#6b7280" tick={{fill:'#9ca3af',fontSize:12}} axisLine={{stroke:'#2e3d54'}}/>
<YAxis stroke="#6b7280" tick={{fill:'#9ca3af',fontSize:12}} axisLine={{stroke:'#2e3d54'}}/>
<Tooltip contentStyle={{backgroundColor:'#0f1419',border:'1px solid #2e3d54',borderRadius:'0',padding:'8px 12px'}} labelStyle={{color:'#e5e7eb',fontWeight:600,marginBottom:'4px'}} itemStyle={{color:'#4a90e2'}}/>
<Line type="monotone" dataKey="flights" stroke="#4a90e2" strokeWidth={2} dot={{fill:'#4a90e2',r:4}} activeDot={{r:6,fill:'#5fb3b3'}}/>
</LineChart>
</ResponsiveContainer>
</div>
<div className="bg-dark-900 border border-dark-800 p-6">
<h3 className="text-lg font-semibold text-neutral-100 mb-6">Airline Distribution</h3>
<ResponsiveContainer width="100%" height={300}>
<BarChart data={stats.airlineData} layout="vertical">
<CartesianGrid strokeDasharray="3 3" stroke="#1a2332" horizontal={false}/>
<XAxis type="number" stroke="#6b7280" tick={{fill:'#9ca3af',fontSize:12}} axisLine={{stroke:'#2e3d54'}}/>
<YAxis type="category" dataKey="name" stroke="#6b7280" tick={{fill:'#9ca3af',fontSize:12}} axisLine={{stroke:'#2e3d54'}} width={100}/>
<Tooltip contentStyle={{backgroundColor:'#0f1419',border:'1px solid #2e3d54',borderRadius:'0',padding:'8px 12px'}} cursor={{fill:'#1a2332'}}/>
<Bar dataKey="value" fill="#4a90e2"/>
</BarChart>
</ResponsiveContainer>
</div>
</div>
<div className="bg-dark-900 border border-dark-800 p-6">
<h3 className="text-lg font-semibold text-neutral-100 mb-6">Aircraft Manufacturers</h3>
<ResponsiveContainer width="100%" height={350}>
<PieChart>
<Pie data={stats.manufacturerData} cx="50%" cy="50%" labelLine={false} label={({name,percent})=>percent>0.05?`${name} ${(percent*100).toFixed(0)}%`:''} outerRadius={120} dataKey="value" stroke="#0f1419" strokeWidth={2}>
{stats.manufacturerData.map((_,i)=>(
<Cell key={`cell-${i}`} fill={COLORS[i%COLORS.length]}/>
))}
</Pie>
<Tooltip contentStyle={{backgroundColor:'#0f1419',border:'1px solid #2e3d54',borderRadius:'0',padding:'8px 12px'}}/>
<Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize:'12px',color:'#9ca3af'}}/>
</PieChart>
</ResponsiveContainer>
</div>
</>
):(
<div className="bg-dark-900 border border-dark-800">
<div className="border-b border-dark-800 p-6">
<h2 className="text-2xl font-bold text-neutral-100">All Flights</h2>
<p className="text-sm text-neutral-400 mt-1">Complete flight history and records</p>
</div>
<div className="overflow-x-auto">
<table className="w-full">
<thead>
<tr className="bg-dark-850 border-b border-dark-800">
<th className="px-6 py-4 text-left text-xs font-semibold text-neutral-300 uppercase tracking-wider">Date</th>
<th className="px-6 py-4 text-left text-xs font-semibold text-neutral-300 uppercase tracking-wider">Flight</th>
<th className="px-6 py-4 text-left text-xs font-semibold text-neutral-300 uppercase tracking-wider">Route</th>
<th className="px-6 py-4 text-left text-xs font-semibold text-neutral-300 uppercase tracking-wider">Aircraft</th>
<th className="px-6 py-4 text-left text-xs font-semibold text-neutral-300 uppercase tracking-wider">Airline</th>
<th className="px-6 py-4 text-right text-xs font-semibold text-neutral-300 uppercase tracking-wider">Actions</th>
</tr>
</thead>
<tbody className="divide-y divide-dark-800">
{flights.map(f=>(
<tr key={f.id} className="hover:bg-dark-850 transition-colors">
<td className="px-6 py-4 text-sm text-neutral-200 font-mono">{f.date}</td>
<td className="px-6 py-4 text-sm font-semibold text-accent-blue">{f.flightNumber}</td>
<td className="px-6 py-4 text-sm text-neutral-300">
<span className="font-mono">{f.depAirport}</span>
<span className="text-neutral-500 mx-2">→</span>
<span className="font-mono">{f.arrAirport}</span>
</td>
<td className="px-6 py-4 text-sm text-neutral-300">{f.planeManufacturer} {f.planeModel}</td>
<td className="px-6 py-4 text-sm text-neutral-300">{f.airline}</td>
<td className="px-6 py-4 text-right">
<div className="flex items-center justify-end gap-3">
<button onClick={()=>openEditModal(f)} className="text-accent-blue hover:text-accent-teal transition-colors">
<Edit2 size={18}/>
</button>
<button onClick={()=>deleteFlight(f)} className="text-accent-red hover:text-red-400 transition-colors">
<Trash2 size={18}/>
</button>
</div>
</td>
</tr>
))}
</tbody>
</table>
</div>
</div>
)}
{showAddModal&&(
<div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
<div className="bg-dark-900 border border-dark-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
<div className="border-b border-dark-800 p-6 flex items-center justify-between">
<div>
<h2 className="text-2xl font-bold text-neutral-100">
{editingFlight?'Edit Flight':'Add New Flight'}
</h2>
<p className="text-sm text-neutral-400 mt-1">
{editingFlight?'Update flight information':'Enter flight details'}
</p>
</div>
<button onClick={closeModal} className="text-neutral-400 hover:text-neutral-100 transition-colors">
<X size={24}/>
</button>
</div>
<div className="p-6">
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div className="col-span-full">
<label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
Flight Date
</label>
<input type="date" value={formData.date} onChange={e=>setFormData({...formData,date:e.target.value})} className={inputClass}/>
</div>
<div>
<label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
Flight Number
</label>
<input type="text" placeholder="AA1234" value={formData.flightNumber} onChange={e=>setFormData({...formData,flightNumber:e.target.value})} className={inputClass}/>
</div>
<div>
<label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
Airline
</label>
<input type="text" placeholder="American Airlines" value={formData.airline} onChange={e=>setFormData({...formData,airline:e.target.value})} className={inputClass}/>
</div>
<div>
<label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
Departure Airport
</label>
<input type="text" placeholder="JFK" value={formData.depAirport} onChange={e=>setFormData({...formData,depAirport:e.target.value})} className={inputClass}/>
</div>
<div>
<label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
Arrival Airport
</label>
<input type="text" placeholder="LAX" value={formData.arrAirport} onChange={e=>setFormData({...formData,arrAirport:e.target.value})} className={inputClass}/>
</div>
<div>
<label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
Manufacturer
</label>
<input type="text" placeholder="Boeing" value={formData.planeManufacturer} onChange={e=>setFormData({...formData,planeManufacturer:e.target.value})} className={inputClass}/>
</div>
<div>
<label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
Model
</label>
<input type="text" placeholder="737-800" value={formData.planeModel} onChange={e=>setFormData({...formData,planeModel:e.target.value})} className={inputClass}/>
</div>
<div>
<label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
Registration
</label>
<input type="text" placeholder="N12345" value={formData.planeRegistration} onChange={e=>setFormData({...formData,planeRegistration:e.target.value})} className={inputClass}/>
</div>
<div>
<label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
Class
</label>
<input type="text" placeholder="Economy" value={formData.airlineClass} onChange={e=>setFormData({...formData,airlineClass:e.target.value})} className={inputClass}/>
</div>
<div>
<label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
Cruising Altitude (ft)
</label>
<input type="number" placeholder="35000" value={formData.cruisingAltitude} onChange={e=>setFormData({...formData,cruisingAltitude:e.target.value})} className={inputClass}/>
</div>
<div className="col-span-full">
<label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
Special Notes
</label>
<input type="text" placeholder="Optional notes or remarks" value={formData.special} onChange={e=>setFormData({...formData,special:e.target.value})} className={inputClass}/>
</div>
</div>
<div className="flex gap-3 mt-6">
<button onClick={handleSubmit} className="flex-1 bg-accent-blue hover:bg-accent-teal text-white py-3 font-semibold transition-colors">
{editingFlight?'Update Flight':'Add Flight'}
</button>
<button onClick={closeModal} className="px-6 bg-dark-800 hover:bg-dark-700 text-neutral-200 py-3 font-semibold border border-dark-700 transition-colors">
Cancel
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
const MetricCard=({title,value,icon,color})=>{const colorClasses={blue:'text-accent-blue',teal:'text-accent-teal',green:'text-accent-green',amber:'text-accent-amber'}
return(
<div className="bg-dark-900 border border-dark-800 p-6">
<div className="flex items-center justify-between mb-3">
<span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{title}</span>
<div className={colorClasses[color]}>{icon}</div>
</div>
<div className="text-3xl font-bold text-neutral-100">{value}</div>
</div>
)}
const TopListCard=({title,items})=>(
<div className="bg-dark-900 border border-dark-800 p-6">
<h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">{title}</h3>
<div className="space-y-3">
{items.length>0?items.map((item,idx)=>(
<div key={idx} className="flex items-center justify-between">
<span className="text-sm text-neutral-200 truncate pr-3">{item.name}</span>
<span className="text-sm font-bold text-accent-blue font-mono">{item.count}</span>
</div>
)):(
<div className="text-sm text-neutral-500">No data available</div>
)}
</div>
</div>
)
export default App
