'use client'

import React from 'react'
import { ChevronDown } from 'lucide-react'
import { theme } from '@/lib/core/theme'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string | number; label: string }[]
  error?: string
  fullWidth?: boolean
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, fullWidth, style, className, ...props }, ref) => {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 6, 
        width: fullWidth ? '100%' : 'auto',
        fontFamily: theme.typography.sans 
      }}>
        {label && (
          <label style={{ 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            color: theme.colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            paddingLeft: 4
          }}>
            {label}
          </label>
        )}
        
        <div style={{ position: 'relative', width: '100%' }}>
          <select
            ref={ref}
            style={{
              width: '100%',
              background: theme.colors.surface,
              border: `1px solid ${error ? theme.colors.danger : theme.colors.border}`,
              borderRadius: 8,
              padding: '10px 36px 10px 12px',
              color: theme.colors.text,
              fontSize: '0.9rem',
              fontFamily: theme.typography.sans,
              appearance: 'none',
              cursor: 'pointer',
              outline: 'none',
              transition: theme.animations.fast,
              ...style
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.colors.accent
              e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.colors.accent}22`
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = error ? theme.colors.danger : theme.colors.border
              e.currentTarget.style.boxShadow = 'none'
            }}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} style={{ background: theme.colors.surface }}>
                {opt.label}
              </option>
            ))}
          </select>
          
          <div style={{ 
            position: 'absolute', 
            right: 12, 
            top: '50%', 
            transform: 'translateY(-50%)', 
            pointerEvents: 'none',
            color: theme.colors.textMuted,
            display: 'flex',
            alignItems: 'center'
          }}>
            <ChevronDown size={16} />
          </div>
        </div>
        
        {error && (
          <span style={{ 
            fontSize: '0.7rem', 
            color: theme.colors.danger, 
            paddingLeft: 4,
            fontWeight: 600
          }}>
            {error}
          </span>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export default Select
