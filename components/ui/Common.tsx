'use client'

import React, { forwardRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { theme } from '@/lib/core/theme'

/* ──── BADGE ──── */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: string
  variant?: 'solid' | 'outline' | 'muted'
}

export function Badge({
  color = theme.colors.accent,
  variant = 'muted',
  children,
  style,
  ...props
}: BadgeProps) {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'solid':
        return { background: `${color}15`, color: color, border: `1px solid ${color}44` }
      case 'outline':
        return { background: 'transparent', color: color, border: `1px solid ${color}` }
      case 'muted':
      default:
        return { background: `${color}15`, color: color, border: `1px solid ${color}33` }
    }
  }

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: '0.65rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontFamily: theme.typography.sans,
    ...getVariantStyles(),
    ...style,
  }

  return (
    <span style={baseStyle} {...props}>
      {children}
    </span>
  )
}

/* ──── BUTTON ──── */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'gold-solid' | 'outline' | 'danger' | 'success' | 'ghost' | 'ghost-outline'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

export function Button({
  variant = 'outline',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: ButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  const hasBadge = React.Children.toArray(children).some(
    child => React.isValidElement(child) && (child.type as any)?.name === 'Badge'
  )

  const containsCount = React.Children.toArray(children).some(
    child => React.isValidElement(child) && (child.props as any)?.style?.borderRadius === '50%'
  )

  const shouldGlow = isHovered && !hasBadge && !containsCount

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'gold':
        return {
          border: `1px solid ${theme.colors.accent}`,
          color: isHovered ? theme.colors.background : theme.colors.accent,
          background: isHovered ? theme.colors.accent : 'transparent',
        }
      case 'gold-solid':
        return {
          border: `1px solid ${theme.colors.accent}`,
          background: isHovered ? theme.colors.accentDark : theme.colors.accent,
          color: theme.colors.onAccent,
        }
      case 'danger':
        return {
          border: `1px solid ${theme.colors.danger}`,
          color: isHovered ? theme.colors.onAccent : theme.colors.danger,
          background: isHovered ? theme.colors.danger : 'transparent',
        }
      case 'success':
        return {
          border: `1px solid ${theme.colors.success}`,
          color: isHovered ? theme.colors.onAccent : theme.colors.success,
          background: isHovered ? theme.colors.success : 'transparent',
        }
      case 'ghost':
        return {
          border: '1px solid transparent',
          color: isHovered ? theme.colors.text : theme.colors.textMuted,
          background: isHovered ? theme.colors.surfaceHover : 'transparent',
        }
      case 'outline':
      default:
        return {
          border: `1px solid ${isHovered ? theme.colors.accent : theme.colors.border}`,
          color: isHovered ? theme.colors.accent : theme.colors.textDim,
          background: isHovered ? theme.colors.accentMuted : 'transparent',
        }
      case 'ghost-outline':
        return {
          border: `1px solid ${isHovered ? 'currentColor' : 'transparent'}`,
          color: isHovered ? (style?.color || theme.colors.accent) : (style?.color || theme.colors.textMuted),
          background: isHovered ? `${style?.color || theme.colors.accent}12` : 'transparent',
        }
    }
  }

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm': return { padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }
      case 'lg': return { padding: '12px 24px', fontSize: '1rem', borderRadius: '10px' }
      case 'md':
      default: return { padding: '8px 18px', fontSize: '0.85rem', borderRadius: '8px' }
    }
  }

  const baseStyle: React.CSSProperties = {
    fontFamily: theme.typography.sans,
    fontWeight: 600,
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    transition: theme.animations.fast,
    display: fullWidth ? 'flex' : 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: fullWidth ? '100%' : 'auto',
    opacity: props.disabled ? 0.4 : 1,
    outline: 'none',
    boxSizing: 'border-box',
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  }

  const renderIcon = () => {
    if (!icon) return null
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {icon}
      </div>
    )
  }

  return (
    <button
      style={baseStyle}
      onMouseEnter={(e) => {
        setIsHovered(true)
        onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        setIsHovered(false)
        onMouseLeave?.(e)
      }}
      {...props}
    >
      {iconPosition === 'left' && renderIcon()}
      {children}
      {iconPosition === 'right' && renderIcon()}
    </button>
  )
}

/* ──── INPUT ──── */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: React.ReactNode
  rightAction?: React.ReactNode
  error?: string
  fullWidth?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, rightAction, error, fullWidth, style, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false)

    const containerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      width: fullWidth ? '100%' : 'auto',
      fontFamily: theme.typography.sans
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
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
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

/* ──── SELECT ──── */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string | number; label: string }[]
  error?: string
  fullWidth?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, fullWidth, style, ...props }, ref) => {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 6, 
        width: fullWidth ? '100%' : 'auto',
        fontFamily: theme.typography.sans 
      }}>
        {label && (
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: 4 }}>
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
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: theme.colors.textMuted, display: 'flex', alignItems: 'center' }}>
            <ChevronDown size={16} />
          </div>
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
Select.displayName = 'Select'
