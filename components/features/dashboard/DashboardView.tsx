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
  relations: any[]
  onSelectEntry: (entry: Entry) => void
  onCreateEntry: () => void
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  entries,
  sources,
  relations,
  onSelectEntry,
  onCreateEntry
}) => {
  const { state: { accentColor, themeMode } } = useAppContext()

  const recentEntries = [...entries]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const stats = [
    { label: 'Entries', value: entries.length, type: 'entries' },
    { label: 'Sources', value: sources.length, type: 'sources' },
    { label: 'Relations', value: relations.length, type: 'relations' }
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
          const typeKey = stat.type;

          let hex = '';
          if (typeKey === 'entries') {
            const colors = THEME_COLORS[accentColor as keyof typeof THEME_COLORS];
            hex = themeMode === 'dark' ? colors.dark : colors.light;
          } else if (typeKey === 'sources') {
            hex = '#06b6d4'; // Cyan for sources
          } else {
            hex = '#a855f7'; // Purple for relations
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
    </div>
  )
}
