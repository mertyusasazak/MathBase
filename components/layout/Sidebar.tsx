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
  PanelLeft
} from 'lucide-react'
import { theme } from '@/lib/core/theme'
import { Button } from '@/components/ui/Common'
import { useSidebarLogic } from '@/hooks/useSidebarLogic'

interface SidebarProps {
  sidebarOpen: boolean
  activeView: 'dashboard' | 'entries' | 'graph' | 'entry' | 'sources' | 'deleted'
  goToView: (view: 'dashboard' | 'entries' | 'graph' | 'sources' | 'deleted') => void
  deletedEntries: DeletedItem[]
  onNewEntry: () => void
  onToggleSidebar: () => void
}

import { CandidateEntry } from '@/types'
import { FileUp } from 'lucide-react'
import ImportReviewModal from '@/components/features/pdf/ImportReviewModal'

import { SunMedium, Moon } from 'lucide-react'

export default function Sidebar({
  sidebarOpen, activeView, goToView,
  deletedEntries,
  onNewEntry,
  onToggleSidebar
}: SidebarProps) {
  const { state, actions } = useSidebarLogic()
  
  // PDF Import State'leri
  const [isUploading, setIsUploading] = React.useState(false)
  const [candidates, setCandidates] = React.useState<CandidateEntry[]>([])
  const [showModal, setShowModal] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)



  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/import/pdf', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to parse PDF')
      
      setCandidates(data.candidates || [])
      setShowModal(true)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleConfirmImport = async (selected: CandidateEntry[]) => {
    try {
      // Loop ile teker teker POST atarak DB'ye ekle
      for (const cand of selected) {
        await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: cand.title,
            type: cand.type,
            content: cand.content,
            tags: [],
            versionNote: 'PDF import'
          })
        })
      }
      setShowModal(false)
      setCandidates([])
      window.location.reload() // Dashboard'u güncellemek için tazeleyici basit çözüm
    } catch (err: any) {
      alert('Error while saving: ' + err.message)
    }
  }

  return (
    <div style={{
      width: sidebarOpen ? 272 : 72,
      minWidth: sidebarOpen ? 272 : 72,
      background: theme.colors.background,
      borderRight: `1px solid ${theme.colors.border}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'visible',
      transition: theme.animations.normal,
      position: 'relative',
      zIndex: 50
    }}>
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
            onMouseEnter={() => actions.setLogoHover(true)}
            onMouseLeave={() => actions.setLogoHover(false)}
            style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: theme.animations.fast, cursor: 'pointer',
              background: state.logoHover ? theme.colors.surface : 'transparent', borderRadius: 6
            }}
          >
            {state.logoHover ? (
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
        <NavButton active={activeView === 'entries'} onClick={() => goToView('entries')} icon={<Library size={18} />} label="Entries" sidebarOpen={sidebarOpen} />
        <NavButton active={activeView === 'graph'} onClick={() => goToView('graph')} icon={<Network size={18} />} label="Graph View" sidebarOpen={sidebarOpen} />
        <NavButton active={activeView === 'sources'} onClick={() => goToView('sources')} icon={<BookOpen size={18} />} label="Sources" sidebarOpen={sidebarOpen} />
        <NavButton active={activeView === 'deleted'} onClick={() => goToView('deleted')} icon={<Trash2 size={18} />} label="Trash" sidebarOpen={sidebarOpen} count={deletedEntries.length} isRed />
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
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          fullWidth={sidebarOpen}
          style={{ height: sidebarOpen ? 42 : 44, padding: sidebarOpen ? undefined : 0 }}
          icon={<FileUp size={18} />}
        >
          {sidebarOpen && (isUploading ? 'Loading...' : 'PDF Import')}
        </Button>
        <input 
          type="file" 
          accept="application/pdf" 
          style={{ display: 'none' }} 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
        />


      </div>

      {showModal && (
        <ImportReviewModal 
          candidates={candidates}
          onConfirm={handleConfirmImport}
          onClose={() => { setShowModal(false); setCandidates([]); }}
        />
      )}
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
