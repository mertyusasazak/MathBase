'use client'

import React, { useState, Suspense } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { Button, Input } from '@/components/ui/Common'
import { SunMedium, Moon, Palette } from 'lucide-react'
import { theme } from '@/lib/core/theme'
import { useAppController, THEME_COLORS, AccentColor } from '@/hooks/useAppController'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { state, refs, actions } = useAppController()
  const [showColorPicker, setShowColorPicker] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100vh', background: theme.colors.background, color: theme.colors.text, overflow: 'hidden' }}>
      <Sidebar
        sidebarOpen={state.sidebarOpen}
        activeView={state.activeView}
        goToView={actions.goToView}
        deletedEntries={state.deletedItems}
        onNewEntry={() => {
          actions.newEntry()
        }}
        onToggleSidebar={() => actions.setSidebarOpen(!state.sidebarOpen)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* TOP BAR */}
        <div 
          className="glass"
          style={{ 
            height: 64, 
            display: 'flex', 
            alignItems: 'center', 
            padding: '0 24px', 
            gap: 16, 
            zIndex: 100,
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ maxWidth: 400, flex: 1, display: 'flex', gap: 16, alignItems: 'center' }}>
            <Input
              ref={refs.searchInputRef}
              value={state.search} onChange={(e: any) => actions.setSearch(e.target.value)}
              placeholder="Search in your knowledge repository..." fullWidth
              onFocus={() => {
                if (!window.location.pathname.includes('entries')) {
                  actions.goToView('entries')
                }
              }}
            />
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowColorPicker(!showColorPicker)}
                style={{ width: 40, height: 40, padding: 0, borderRadius: '50%', color: theme.colors.accent }}
                icon={<Palette size={20} />}
              />
              {showColorPicker && (
                <>
                  <div
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                    onClick={() => setShowColorPicker(false)}
                  />
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 110,
                    background: theme.colors.surface, border: `1px solid ${theme.colors.border}`,
                    borderRadius: 12, padding: 12, display: 'flex', gap: 8, boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                    animation: 'fadeIn 0.2s ease-out'
                  }}>
                    {Object.entries(THEME_COLORS).map(([name, colors]) => (
                      <button
                        key={name}
                        onClick={() => {
                          actions.changeAccentColor(name as AccentColor)
                          setShowColorPicker(false)
                        }}
                        style={{
                          width: 24, height: 24, borderRadius: '50%', padding: 0, border: state.accentColor === name ? `2px solid ${theme.colors.text}` : 'none',
                          background: state.themeMode === 'dark' ? colors.dark : colors.light,
                          cursor: 'pointer', transition: 'transform 0.1s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={actions.toggleTheme}
              style={{ width: 40, height: 40, padding: 0, borderRadius: '50%' }}
              icon={state.themeMode === 'dark' ? <SunMedium size={20} /> : <Moon size={20} />}
            />
          </div>
        </div>

        {/* VIEW AREA */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
