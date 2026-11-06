import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <Sidebar />
      <main className="pl-64">
        <div className="min-h-screen">
          <Outlet />
        </div>
      </main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: '#1A2235', border: '1px solid rgba(255,255,255,0.1)', color: '#F1F5F9' },
        }}
      />
    </div>
  )
}
