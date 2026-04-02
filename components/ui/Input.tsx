'use client'

import React from 'react'
import { theme } from '@/lib/core/theme'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: React.ReactNode
  rightAction?: React.ReactNode
  error?: string
  fullWidth?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, rightAction, error, fullWidth, style, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)

    const containerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      width: fullWidth ? '100%' : 'auto',
      fontFamily: theme.typography.sans
    }

    const inputWrapperStyle: React.CSSProperties = {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      width: '100%'
    }

    const inputBaseStyle: React.CSSProperties = {
      width: '100%',
      background: theme.colors.surface,
      border: `1px solid ${error ? theme.colors.danger : (isFocused ? theme.colors.accent : theme.colors.border)}`,
      borderRadius: 8,
      padding: '10px 16px',
      paddingLeft: icon ? 40 : 16,
      paddingRight: rightAction ? 44 : 16,
      color: theme.colors.text,
      fontSize: '0.94rem',
      fontFamily: theme.typography.sans,
      outline: 'none',
      transition: theme.animations.fast,
      boxShadow: isFocused ? `0 0 0 3px ${theme.colors.accent}22` : 'none',
      ...style
    }

    return (
      <div style={containerStyle}>
        {label && (
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: 4 }}>
            {label}
          </label>
        )}
        <div style={inputWrapperStyle}>
          {icon && (
            <div style={{ position: 'absolute', left: 14, color: isFocused ? theme.colors.accent : theme.colors.textMuted, display: 'flex', transition: theme.animations.fast }}>
              {icon}
            </div>
          )}
          <input
            ref={ref}
            style={inputBaseStyle}
            onFocus={(e) => {
              setIsFocused(true)
              onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              onBlur?.(e)
            }}
            {...props}
          />
          {rightAction && (
            <div style={{ position: 'absolute', right: 8, display: 'flex', alignItems: 'center' }}>
              {rightAction}
            </div>
          )}
        </div>
        {error && (
          <span style={{ fontSize: '0.7rem', color: theme.colors.danger, paddingLeft: 4, fontWeight: 600 }}>
            {error}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
