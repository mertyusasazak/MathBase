import React from 'react'
import { renderTitle } from '@/lib/core/math'
import { Entry } from '@/types'
import {
  LayoutDashboard,
  Library,
  Network,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Plus,
  FileJson,
  ArrowRight,
  BookOpen,
  Square,
  CheckSquare,
  Trash2,
  FileText,
  PanelLeft
} from 'lucide-react'


interface SidebarProps {
  sidebarOpen: boolean
  activeView: 'dashboard' | 'entries' | 'graph' | 'entry' | 'sources' | 'deleted'
  goToView: (view: 'dashboard' | 'entries' | 'graph' | 'sources' | 'deleted') => void
  deletedEntries: Entry[]
  onNewEntry: () => void
}

const TYPE_COLORS: Record<string, string> = {
  definition: '#6b8fcc', theorem: '#c96b6b', lemma: '#8fcc8f',
  corollary: '#cc6ba8', example: '#cc9f6b', remark: '#a06bcc'
}

export default function Sidebar({
  sidebarOpen, activeView, goToView,
  deletedEntries,
  onNewEntry,
  onToggleSidebar
}: SidebarProps & { onToggleSidebar: () => void }) {
  const [logoHover, setLogoHover] = React.useState(false)
  return (
    <div style={{
      width: sidebarOpen ? 272 : 72,
      minWidth: sidebarOpen ? 272 : 72,
      background: '#16161a',
      borderRight: '1px solid #2a2a33',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'visible',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      zIndex: 50
    }}>
      {/* LOGO & TOGGLE ALANI */}
      <div
        style={{ padding: sidebarOpen ? '16px 20px' : '16px 0', height: 64, boxSizing: 'border-box', borderBottom: '1px solid #2a2a33', display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center', transition: 'all 0.3s', userSelect: 'none' }}>

        {sidebarOpen ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div style={{ animation: 'fadeIn 0.2s ease-in' }}>
              <div style={{ fontFamily: 'EB Garamond, serif', fontSize: '1.4rem', color: '#c9a84c', fontWeight: 600, lineHeight: 1 }}>∂ MathBase</div>
              <div style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.65rem', color: '#7a7870', marginTop: 4, letterSpacing: '0.05em' }}>KNOWLEDGE REPOSITORY</div>
            </div>
            <button
              onClick={onToggleSidebar}
              style={{ background: 'transparent', border: 'none', color: '#7a7870', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, flexShrink: 0, borderRadius: 6, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#e8e6df'; e.currentTarget.style.background = '#2a2a33'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#7a7870'; e.currentTarget.style.background = 'transparent'; }}
            >
              <PanelLeft size={18} />
            </button>
          </div>
        ) : (
          <div
            onClick={onToggleSidebar}
            onMouseEnter={() => setLogoHover(true)}
            onMouseLeave={() => setLogoHover(false)}
            style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', cursor: 'pointer', background: logoHover ? '#2a2a33' : 'transparent', borderRadius: 6 }}>
            {logoHover ? (
              <PanelLeft size={18} color="#e8e6df" style={{ animation: 'fadeIn 0.2s ease-in' }} />
            ) : (
              <div style={{ fontFamily: 'EB Garamond, serif', fontSize: '1.2rem', color: '#c9a84c', fontWeight: 600, animation: 'fadeIn 0.2s ease-in' }}>MB</div>
            )}
          </div>
        )}
      </div>

      {/* Ana Navigasyon */}
      <div style={{ padding: sidebarOpen ? '20px 12px' : '20px 8px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {sidebarOpen && <div style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7a7870', paddingLeft: 8, marginBottom: 4 }}>Views</div>}
        <NavButton active={activeView === 'dashboard'} onClick={() => goToView('dashboard')} icon={<LayoutDashboard size={18} strokeWidth={2} />} label="Dashboard" sidebarOpen={sidebarOpen} />
        <NavButton active={activeView === 'entries'} onClick={() => goToView('entries')} icon={<Library size={18} strokeWidth={2} />} label="All Entries" sidebarOpen={sidebarOpen} />
        <NavButton active={activeView === 'graph'} onClick={() => goToView('graph')} icon={<Network size={18} strokeWidth={2} />} label="Graph View" sidebarOpen={sidebarOpen} />
        <NavButton active={activeView === 'sources'} onClick={() => goToView('sources')} icon={<BookOpen size={18} strokeWidth={2} />} label="Sources" sidebarOpen={sidebarOpen} />
        <NavButton active={activeView === 'deleted'} onClick={() => goToView('deleted')} icon={<Trash2 size={18} strokeWidth={2} />} label={`Recently Deleted${deletedEntries.length > 0 ? ` (${deletedEntries.length})` : ''}`} sidebarOpen={sidebarOpen} isRed />

      </div>

      {/* Footer Actions */}
      <div style={{ padding: sidebarOpen ? '16px 16px' : '16px 8px', borderTop: '1px solid #2a2a33', display: 'flex', flexDirection: 'column', gap: 6, alignItems: sidebarOpen ? 'stretch' : 'center' }}>
        <button
          onClick={onNewEntry}
          className="btn-base btn-gold btn-gold-solid group-hover-gold"
          title={!sidebarOpen ? "New Entry" : undefined}
          style={{ width: sidebarOpen ? '100%' : '44px', height: sidebarOpen ? '40px' : '44px', padding: sidebarOpen ? '6px 14px' : '0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 700, borderRadius: 8, transition: 'all 0.2s ease-in-out' }}
        >
          <Plus size={18} strokeWidth={2.5} /> {sidebarOpen && <span>New Entry</span>}
        </button>
      </div>
    </div>
  )
}

function NavButton({ active, onClick, icon, label, sidebarOpen, isRed }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, sidebarOpen: boolean, isRed?: boolean }) {
  const color = active ? (isRed ? '#c96b6b' : '#c9a84c') : '#b8b5ae'
  const hoverColor = active ? color : '#e8e6df'
  const [hover, setHover] = React.useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: sidebarOpen ? '8px 12px' : '8px 0',
        justifyContent: sidebarOpen ? 'flex-start' : 'center',
        border: 'none', borderRadius: 6, cursor: 'pointer',
        fontFamily: 'Instrument Sans, sans-serif', fontWeight: 600, fontSize: '0.85rem',
        background: active ? '#1e1e24' : (hover ? '#1e1e24' : 'transparent'),
        color: hover ? hoverColor : color,
        width: '100%',
        position: 'relative',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Accent Bar */}
      <div style={{
        position: 'absolute', left: 0, top: 4, bottom: 4, width: 3,
        background: active ? (isRed ? '#c96b6b' : '#c9a84c') : 'transparent',
        borderRadius: '0 4px 4px 0',
        transition: 'background 0.2s',
        display: 'block' // Ensure visibility even when collapsed
      }} />

      {icon}
      {sidebarOpen ? (
        <span style={{ transition: 'opacity 0.2s', opacity: 1, whiteSpace: 'nowrap' }}>{label}</span>
      ) : (
        /* Tooltip Preview */
        <div style={{
          position: 'absolute', left: '100%', marginLeft: 12,
          padding: '6px 12px', background: 'rgba(22, 22, 26, 0.85)',
          backdropFilter: 'blur(8px)', border: '1px solid #2a2a33',
          borderRadius: 6, color: '#e8e6df', fontSize: '0.8rem', whiteSpace: 'nowrap',
          pointerEvents: 'none',
          opacity: hover ? 1 : 0,
          transform: `translateX(${hover ? 0 : -5}px)`,
          transition: 'all 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          {label}
        </div>
      )}
    </button>
  )
}
