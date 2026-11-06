import { NavLink, useLocation } from 'react-router-dom'
import { BarChart3, FileText, TrendingUp, ShieldCheck, Settings, LogOut, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

const NAV = [
  { to: '/dashboard', icon: ShieldCheck, label: 'Compliance Dashboard' },
  { to: '/contracts', icon: FileText, label: 'Contract Management' },
  { to: '/recognition', icon: TrendingUp, label: 'Recognition Schedule' },
  { to: '/analytics', icon: BarChart3, label: 'Revenue Analytics' },
]

export default function Sidebar() {
  const loc = useLocation()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex flex-col w-64 bg-sidebar border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-DEFAULT/20 border border-primary-DEFAULT/30">
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
            <rect x="2" y="12" width="3" height="6" rx="0.5" fill="#1E3A5F"/>
            <rect x="6.5" y="9" width="3" height="9" rx="0.5" fill="#4F8EF7" opacity="0.7"/>
            <rect x="11" y="6" width="3" height="12" rx="0.5" fill="#4F8EF7"/>
            <rect x="15.5" y="3" width="3" height="15" rx="0.5" fill="#34D399"/>
            <polyline points="3.5,11.5 8,8.5 12.5,5.5 17,2.5" stroke="#34D399" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.7"/>
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold text-text-primary tracking-tight">RevenIQ</div>
          <div className="text-2xs text-text-muted">ASC 606 Platform</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <div className="text-2xs font-medium text-text-muted uppercase tracking-wider px-2 py-1 mb-1">Platform</div>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
              isActive
                ? 'bg-primary-muted text-primary-DEFAULT border border-primary-DEFAULT/20'
                : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
            )}
          >
            <Icon size={16} className="shrink-0" />
            <span className="flex-1">{label}</span>
            {loc.pathname.startsWith(to) && <ChevronRight size={12} className="opacity-50" />}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-border pt-3 space-y-0.5">
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary w-full transition-colors">
          <Settings size={15} />
          <span>Settings</span>
        </button>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-primary-DEFAULT border border-primary-DEFAULT/30">
            HM
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-text-primary truncate">Harish Maddi</div>
            <div className="text-2xs text-text-muted truncate">Rev. Recognition Lead</div>
          </div>
          <button className="text-text-muted hover:text-text-secondary transition-colors" title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
