import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Stores from './pages/Stores'
import StoreDetail from './pages/StoreDetail'
import ManagerDashboard from './pages/ManagerDashboard'
import Orders from './pages/Orders'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'

function App() {
  const { user, loading } = useAuth()
  useEffect(() => {
    const services = [
      'https://supply-sight-api.onrender.com',
      'https://supply-sight-ml.onrender.com'
    ]
    services.forEach(url => {
      fetch(url)
        .then(() => console.log(`Pinged ${url}`))
        .catch(err => console.error(`Ping failed for ${url}`, err))
    })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={!user ? <Home /> : <Navigate to="/dashboard" />} />
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
      
      {/* Protected routes */}
      <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
        <Route path="dashboard" element={
          user?.role === 'manager' ? <Navigate to="/manager" /> : <Dashboard />
        } />
        <Route path="manager" element={
          user?.role === 'manager' ? <ManagerDashboard /> : <Navigate to="/dashboard" />
        } />
        <Route path="stores" element={<Stores />} />
        <Route path="stores/:id" element={<StoreDetail />} />
        <Route path="orders" element={<Orders />} />
        <Route path="profile" element={<Profile />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>
    </Routes>
  )
}

export default App 
