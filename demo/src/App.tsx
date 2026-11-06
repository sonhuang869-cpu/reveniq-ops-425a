import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Layout from './components/layout/Layout'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Contracts = lazy(() => import('./pages/Contracts'))
const ContractNew = lazy(() => import('./pages/ContractNew'))
const ContractDetail = lazy(() => import('./pages/ContractDetail'))
const RecognitionSchedule = lazy(() => import('./pages/RecognitionSchedule'))
const Analytics = lazy(() => import('./pages/Analytics'))

function PageFallback() {
  return <div className="min-h-screen flex items-center justify-center"><div className="text-text-muted text-sm animate-pulse">Loading…</div></div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/contracts/new" element={<ContractNew />} />
          <Route path="/contracts/:id" element={<ContractDetail />} />
          <Route path="/recognition" element={<RecognitionSchedule />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-mono font-bold text-text-muted mb-3">404</div>
                <div className="text-text-secondary mb-6">Page not found</div>
                <a href="/dashboard" className="px-4 py-2 rounded-lg bg-primary-DEFAULT text-white text-sm hover:bg-primary-hover transition-colors">
                  Back to Dashboard
                </a>
              </div>
            </div>
          } />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
