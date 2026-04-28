'use client'

import React from 'react'
import { DeletedItem } from '@/types'
import {
  LayoutDashboard,
  Library,
  Network,
  Trash2,
  BookOpen,
  Plus,
  PanelLeft,
  FileText
} from 'lucide-react'
import { theme } from '@/lib/core/theme'
import { Button } from '@/components/ui/Common'

interface SidebarProps {
  sidebarOpen: boolean
  activeView: 'dashboard' | 'entry' | 'graph' | 'sources' | 'deleted' | 'import'
  goToView: (view: 'dashboard' | 'entry' | 'graph' | 'sources' | 'deleted' | 'import') => void
  deletedEntries: DeletedItem[]
  onNewEntry: () => void
  onToggleSidebar: () => void
}

export default function Sidebar({
  sidebarOpen, activeView, goToView,
  deletedEntries,
  onNewEntry,
  onToggleSidebar
}: SidebarProps) {
  const [logoHover, setLogoHover] = React.useState(false)

  return (
    <div 
      className="glass"
      style={{ 
        width: sidebarOpen ? 280 : 80, 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        transition: theme.animations.normal, 
        zIndex: 100,
        boxShadow: 'var(--shadow-lg)'
      }}
    >
      {/* LOGO & TOGGLE ALANI */}
      <div style={{
        padding: sidebarOpen ? '16px 20px' : '16px 0',
        height: 64,
        boxSizing: 'border-box',
        borderBottom: `1px solid ${theme.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: sidebarOpen ? 'space-between' : 'center',
        transition: theme.animations.normal,
        userSelect: 'none'
      }}>
        {sidebarOpen ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div style={{ animation: `fadeIn ${theme.animations.fast}` }}>
              <div style={{ fontFamily: theme.typography.serif, fontSize: '1.4rem', color: theme.colors.accent, fontWeight: 600, lineHeight: 1 }}>∂ MathBase</div>
              <div style={{ fontFamily: theme.typography.sans, fontSize: '0.65rem', color: theme.colors.textMuted, marginTop: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>KNOWLEDGE REPOSITORY</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              style={{ width: 32, height: 32, padding: 0 }}
              icon={<PanelLeft size={18} />}
            />
          </div>
        ) : (
          <div
            onClick={onToggleSidebar}
            onMouseEnter={() => setLogoHover(true)}
            onMouseLeave={() => setLogoHover(false)}
            style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: theme.animations.fast, cursor: 'pointer',
              background: logoHover ? theme.colors.surface : 'transparent', borderRadius: 6
            }}
          >
            {logoHover ? (
              <PanelLeft size={18} color={theme.colors.text} style={{ animation: `fadeIn ${theme.animations.fast}` }} />
            ) : (
              <div style={{ fontFamily: theme.typography.serif, fontSize: '1.2rem', color: theme.colors.accent, fontWeight: 600 }}>MB</div>
            )}
          </div>
        )}
      </div>

      {/* Ana Navigasyon */}
      <div style={{ padding: sidebarOpen ? '20px 12px' : '20px 8px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {sidebarOpen && (
          <div style={{
            fontFamily: theme.typography.sans, fontSize: '0.65rem', textTransform: 'uppercase',
            letterSpacing: '0.1em', color: theme.colors.textMuted, paddingLeft: 8, marginBottom: 8
          }}>
            Views
          </div>
        )}
        <NavButton active={activeView === 'dashboard'} onClick={() => goToView('dashboard')} icon={<LayoutDashboard size={18} />} label="Dashboard" sidebarOpen={sidebarOpen} />
        <NavButton active={activeView === 'entry'} onClick={() => goToView('entry')} icon={<Library size={18} />} label="Library" sidebarOpen={sidebarOpen} />
        <NavButton active={activeView === 'graph'} onClick={() => goToView('graph')} icon={<Network size={18} />} label="Graph View" sidebarOpen={sidebarOpen} />
        <NavButton active={activeView === 'sources'} onClick={() => goToView('sources')} icon={<BookOpen size={18} />} label="Sources" sidebarOpen={sidebarOpen} />
        <NavButton active={activeView === 'deleted'} onClick={() => goToView('deleted')} icon={<Trash2 size={18} />} label="Trash Bin" sidebarOpen={sidebarOpen} count={deletedEntries.length} isRed />
      </div>

      {/* Footer Actions */}
      <div style={{
        padding: sidebarOpen ? '16px 16px' : '16px 8px',
        borderTop: `1px solid ${theme.colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }}>
        <Button
          variant="gold"
          onClick={onNewEntry}
          fullWidth={sidebarOpen}
          style={{ height: sidebarOpen ? 42 : 44, padding: sidebarOpen ? undefined : 0 }}
          icon={<Plus size={18} strokeWidth={2.5} />}
        >
          {sidebarOpen && "New Entry"}
        </Button>

        <Button
          variant="outline"
          onClick={() => goToView('import')}
          fullWidth={sidebarOpen}
          style={{ 
            height: sidebarOpen ? 42 : 44, 
            padding: sidebarOpen ? undefined : 0,
            borderColor: activeView === 'import' ? theme.colors.accent : theme.colors.border,
            color: activeView === 'import' ? theme.colors.accent : theme.colors.text
          }}
          icon={<FileText size={18} />}
        >
          {sidebarOpen && "PDF / JSON Import"}
        </Button>
      </div>
    </div>
  )
}

interface NavButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  sidebarOpen: boolean
  count?: number
  isRed?: boolean
}

function NavButton({ active, onClick, icon, label, sidebarOpen, count, isRed }: NavButtonProps) {
  const [hover, setHover] = React.useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px',
        justifyContent: sidebarOpen ? 'flex-start' : 'center',
        border: 'none', borderRadius: 10, cursor: 'pointer',
        fontFamily: theme.typography.sans, fontWeight: 600, fontSize: '0.9rem',
        background: hover ? theme.colors.surfaceHover : 'transparent',
        color: active ? (isRed ? theme.colors.danger : theme.colors.accent) : (hover ? theme.colors.text : theme.colors.textMuted),
        width: '100%',
        position: 'relative',
        transition: theme.animations.fast,
        outline: 'none',
        boxShadow: 'none'
      }}
    >
      {/* Active Indicator Bar */}
      {active && (
        <div style={{
          position: 'absolute', left: 0, top: 8, bottom: 8, width: 3,
          background: isRed ? theme.colors.danger : theme.colors.accent,
          borderRadius: '0 4px 4px 0'
        }} />
      )}

      {/* Icon with drop-shadow glow */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {icon}
      </div>

      {sidebarOpen ? (
        <>
          <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>{label}</span>
          {count !== undefined && count > 0 && (
            <span style={{
              fontSize: '0.75rem',
              background: isRed ? `${theme.colors.danger}12` : `${theme.colors.accent}08`,
              color: isRed ? theme.colors.danger : theme.colors.accent,
              padding: '2px 8px',
              borderRadius: 4,
              border: `1px solid ${isRed ? theme.colors.danger : theme.colors.accent}33`,
              fontWeight: 700
            }}>
              {count}
            </span>
          )}
        </>
      ) : (
        /* Tooltip Preview */
        <div style={{
          position: 'absolute', left: '100%', marginLeft: 12,
          padding: '8px 12px', background: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: 8, color: theme.colors.text, fontSize: '0.85rem', whiteSpace: 'nowrap',
          pointerEvents: 'none',
          opacity: hover ? 1 : 0,
          transform: `translateX(${hover ? 0 : -5}px)`,
          transition: theme.animations.normal,
          zIndex: 100,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
        }}>
          {label} {count !== undefined && count > 0 && `(${count})`}
        </div>
      )}
    </button>
  )
}
