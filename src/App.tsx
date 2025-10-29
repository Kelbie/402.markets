import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NDKProvider from './components/NDKProvider'
import { EndpointValidationProvider } from './lib/endpoint-validation-context'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import ApiDetail from './pages/ApiDetail'
import Profile from './pages/Profile'
import Docs from './pages/Docs'
import Settings from './pages/Settings'
import Analytics from './pages/Analytics'

function App() {
  return (
    <div className="font-sans">
      <BrowserRouter>
        <NDKProvider />
        <EndpointValidationProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/d/:d" element={<ApiDetail />} />
            <Route path="/p/:pubkey" element={<Profile />} />
            <Route path="/docs" element={<Docs />} />
          </Routes>
        </EndpointValidationProvider>
      </BrowserRouter>
    </div>
  )
}

export default App
