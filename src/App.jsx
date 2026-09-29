import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AppHeader from './components/layout/AppHeader'
import BackgroundShapes from './components/layout/BackgroundShapes'
import SubmitRequestPage from './pages/SubmitRequestPage'
import AllRequestsPage from './pages/AllRequestsPage'

// Approvals and All Requests are now one merged page/route. This keeps any
// already-sent digest emails' /approvals?token=... links working.
function ApprovalsRedirect() {
  const location = useLocation()
  return <Navigate to={`/requests${location.search}`} replace />
}

export default function App() {
  return (
    <div className="relative min-h-screen">
      <BackgroundShapes />
      <AppHeader />
      <Routes>
        <Route path="/" element={<Navigate to="/submit" replace />} />
        <Route path="/submit" element={<SubmitRequestPage />} />
        <Route path="/requests" element={<AllRequestsPage />} />
        <Route path="/approvals" element={<ApprovalsRedirect />} />
        <Route path="*" element={<Navigate to="/submit" replace />} />
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'font-body text-sm',
          style: { borderRadius: '10px', padding: '10px 14px' },
          success: { iconTheme: { primary: '#EE773D', secondary: '#fff' } },
        }}
      />
    </div>
  )
}
