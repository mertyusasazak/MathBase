'use client'

import React from 'react'
import Card from '@/components/ui/Card'
import { Button, Badge } from '@/components/ui/Common'
import { ArrowUp } from 'lucide-react'
import { theme } from '@/lib/core/theme'
import { renderTitle } from '@/lib/core/math'
import { Entry, Source } from '@/types'
import { TYPE_COLORS } from '@/lib/core/constants'

import { useAppContext, THEME_COLORS } from '@/lib/context/AppContext'

interface DashboardViewProps {
  entries: Entry[]
  sources: Source[]
  onSelectEntry: (entry: Entry) => void
  onCreateEntry: () => void
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  entries,
  sources,
  onSelectEntry,
  onCreateEntry
}) => {
  const { state: { accentColor, themeMode } } = useAppContext()
  
  const recentEntries = [...entries]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const stats = [
    { label: 'Entry', value: entries.length },
    { label: 'Definitions', value: entries.filter(e => e.type === 'definition').length },
    { label: 'Theorems', value: entries.filter(e => e.type === 'theorem').length },
    { label: 'Sources', value: sources.length }
  ]

  const [showScrollTop, setShowScrollTop] = React.useState(false)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowScrollTop(e.currentTarget.scrollTop > 300)
  }

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div 
      ref={scrollContainerRef}
      onScroll={handleScroll}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start', // Changed to flex-start for better scroll behavior
        flexDirection: 'column',
        gap: 32,
        padding: '40px 60px',
        overflowY: 'auto',
        position: 'relative'
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'EB Garamond, serif',
          fontSize: '3.5rem',
          color: theme.colors.accent,
          marginBottom: 12
        }}>∂ MathBase</div>
        <div style={{
          fontFamily: 'Instrument Sans, sans-serif',
          fontSize: '0.85rem',
          color: theme.colors.textMuted,
          letterSpacing: '0.08em'
        }}>Your personal mathematical knowledge repository</div>
      </div>

      <style>{`
        .row-hover-group {
          position: relative;
          transition: all 0.2s ease-in-out;
          border: 1px solid ${theme.colors.border} !important;
        }
        .row-hover-group:hover {
          border-color: ${theme.colors.accent} !important;
          box-shadow: 0 0 12px ${theme.colors.accent}22;
          transform: translateY(-2px);
        }
      `}</style>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        {stats.map(stat => {
          const typeKey = stat.label.toLowerCase().includes('source') ? 'source' : 
                         stat.label.toLowerCase().includes('theorem') ? 'theorem' :
                         stat.label.toLowerCase().includes('definition') ? 'definition' : 'accent';
          
          let hex = '';
          if (typeKey === 'accent') {
            const colors = THEME_COLORS[accentColor as keyof typeof THEME_COLORS];
            hex = themeMode === 'dark' ? colors.dark : colors.light;
          } else if (typeKey === 'source') {
            hex = '#06b6d4'; // Base source cyan
          } else {
            hex = (TYPE_COLORS as any)[typeKey];
          }
          
          const bgColor = `${hex}08`;
          const borderColor = `${hex}33`;
          
          return (
            <Card 
              key={stat.label} 
              style={{ 
                textAlign: 'center', 
                padding: '24px 32px', 
                minWidth: 140,
                background: bgColor,
                border: `1px solid ${borderColor}`,
              }}
            >
              <div style={{
                fontFamily: theme.typography.serif,
                fontSize: '2.5rem',
                color: hex,
                lineHeight: 1
              }}>{stat.value}</div>
              <div style={{
                fontFamily: theme.typography.sans,
                fontSize: '0.75rem',
                color: theme.colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginTop: 10,
                fontWeight: 700
              }}>{stat.label}</div>
            </Card>
          );
        })}
      </div>

      {entries.length > 0 ? (
        <div style={{ width: '100%', maxWidth: 640 }}>
          <div style={{
            fontFamily: theme.typography.sans,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: theme.colors.textMuted,
            marginBottom: 16,
            fontWeight: 700
          }}>Recent Activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentEntries.map(e => (
              <Card
                key={e.id}
                onClick={() => onSelectEntry(e)}
                className="row-hover-group"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <Badge variant="solid" color={TYPE_COLORS[e.type]}>
                  {e.type.slice(0, 3)}
                </Badge>
                <span style={{
                  fontFamily: theme.typography.serif,
                  fontSize: '1.1rem',
                  flex: 1,
                  color: theme.colors.text
                }} dangerouslySetInnerHTML={{ __html: renderTitle(e.title) }} />
                <span style={{
                  fontFamily: theme.typography.sans,
                  fontSize: '0.75rem',
                  color: theme.colors.textMuted
                }}>{new Date(e.updatedAt).toLocaleDateString()}</span>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Button
          variant="gold-solid"
          size="lg"
          onClick={onCreateEntry}
        >
          + Create your first entry
        </Button>
      )}

      {/* BACK TO TOP BUTTON */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          style={{
            position: 'fixed',
            bottom: 40,
            right: 40,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: theme.colors.accent,
            color: theme.colors.background,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: `0 10px 40px ${theme.colors.accent}66`,
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease-out'
          }}
          className="btn-action-animate"
        >
          <ArrowUp size={24} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
