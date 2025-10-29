import { Routes, Route } from 'react-router-dom'
import { EndpointValidationProvider } from './lib/endpoint-validation-context'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import ApiDetail from './pages/ApiDetail'
import Profile from './pages/Profile'

function AppServer() {
  return (
    <div className="font-sans">
      <EndpointValidationProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/d/:d" element={<ApiDetail />} />
          <Route path="/p/:pubkey" element={<Profile />} />
        </Routes>
      </EndpointValidationProvider>
    </div>
  )
}

export default AppServer
