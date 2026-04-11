'use client'

import React from 'react'
import { theme } from '@/lib/core/theme'
import { MathRenderer } from '@/lib/core/MathRenderer'
import { X, Copy, Zap } from 'lucide-react'

interface MathGuideProps {
  onClose: () => void
  onInsert: (text: string) => void
}

const GUIDE_SECTIONS = [
  {
    title: 'Base & Layout',
    items: [
      { label: 'Inline Math', code: '$x$' },
      { label: 'Display Math', code: '$$ x $$' },
      { label: 'Fraction', code: '$\\frac{a}{b}$' },
      { label: 'Square Root', code: '$\\sqrt{x}$' },
      { label: 'Root (n-th)', code: '$\\sqrt[n]{x}$' },
    ]
  },
  {
    title: 'Algebra',
    items: [
      { label: 'Power', code: '$x^2$' },
      { label: 'Subscript', code: '$x_i$' },
      { label: 'Complex Power', code: '$e^{i\\pi}$' },
      { label: 'Not Equal', code: '$\\neq$' },
      { label: 'Approximate', code: '$\\approx$' },
      { label: 'Infinity', code: '$\\infty$' },
    ]
  },
  {
    title: 'Operators & Limits',
    items: [
      { label: 'Summation', code: '$\\sum_{i=1}^{n}$' },
      { label: 'Integral', code: '$\\int_{a}^{b}$' },
      { label: 'Limit', code: '$\\lim_{x \\to \\infty}$' },
      { label: 'Partial', code: '$\\partial$' },
      { label: 'Gradient', code: '$\\nabla$' },
    ]
  },
  {
    title: 'Greek Letters',
    items: [
      { label: 'Alpha/Beta', code: '$\\alpha, \\beta$' },
      { label: 'Gamma/Delta', code: '$\\gamma, \\delta$' },
      { label: 'Pi/Lambda', code: '$\\pi, \\lambda$' },
      { label: 'Theta/Omega', code: '$\\theta, \\omega$' },
      { label: 'Sigma/Phi', code: '$\\sigma, \\phi$' },
    ]
  },
  {
    title: 'Logic & Sets',
    items: [
      { label: 'Implies', code: '$\\implies$' },
      { label: 'IFF', code: '$\\iff$' },
      { label: 'Set Member', code: '$\\in$' },
      { label: 'Subset', code: '$\\subset$' },
      { label: 'For All', code: '$\\forall$' },
      { label: 'Exists', code: '$\\exists$' },
    ]
  }
]

export function MathGuide({ onClose, onInsert }: MathGuideProps) {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: 300,
      height: '100%',
      background: theme.colors.surface,
      borderLeft: `1px solid ${theme.colors.border}`,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 200,
      boxShadow: `-10px 0 30px rgba(0,0,0,0.15)`,
      animation: 'slideInRight 0.3s ease-out'
    }}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .math-item:hover {
          background: ${theme.colors.surfaceHover} !important;
        }
      `}</style>
      
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${theme.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: theme.colors.surface
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={16} color={theme.colors.accent} />
          <span style={{ 
            fontSize: '0.75rem', 
            fontWeight: 800, 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em',
            color: theme.colors.text
          }}>Math Reference</span>
        </div>
        <button 
          onClick={onClose}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: theme.colors.textMuted, 
            cursor: 'pointer',
            padding: 4,
            display: 'flex'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {/* Usage Tips */}
        <div style={{
          margin: '0 20px 20px 20px',
          padding: '12px',
          background: `${theme.colors.accent}08`,
          border: `1px solid ${theme.colors.accent}22`,
          borderRadius: 8
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: theme.colors.accent, marginBottom: 4 }}>HOW TO USE</div>
          <div style={{ fontSize: '0.65rem', color: theme.colors.textMuted, lineHeight: 1.4 }}>
            Math symbols must be inside <strong style={{color: theme.colors.text}}>$</strong> for inline math or <strong style={{color: theme.colors.text}}>$$</strong> for blocks.
          </div>
        </div>
        {GUIDE_SECTIONS.map((section, idx) => (
          <div key={section.title} style={{ marginBottom: 24 }}>
            <div style={{ 
              padding: '0 20px 8px 20px',
              fontSize: '0.65rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: theme.colors.accent,
              letterSpacing: '0.05em'
            }}>
              {section.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {section.items.map(item => (
                <div 
                  key={item.label}
                  className="math-item"
                  onClick={() => onInsert(item.code)}
                  style={{
                    padding: '10px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    transition: theme.animations.fast,
                    borderBottom: `1px solid ${theme.colors.border}22`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: theme.colors.text, fontWeight: 600 }}>{item.label}</span>
                    <span style={{ fontSize: '0.65rem', color: theme.colors.textMuted, fontFamily: theme.typography.mono }}>{item.code}</span>
                  </div>
                  <div style={{ 
                    background: theme.colors.background, 
                    padding: '8px', 
                    borderRadius: 4,
                    display: 'flex',
                    justifyContent: 'center',
                    border: `1px solid ${theme.colors.border}44`
                  }}>
                    <MathRenderer content={item.code} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ 
        padding: '12px 20px', 
        fontSize: '0.7rem', 
        color: theme.colors.textMuted,
        borderTop: `1px solid ${theme.colors.border}`,
        fontStyle: 'italic',
        lineHeight: 1.4
      }}>
        Click any item to insert the code at your cursor position.
      </div>
    </div>
  )
}
