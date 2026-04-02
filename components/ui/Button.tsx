'use client'

import React from 'react'
import { theme } from '@/lib/core/theme'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'gold-solid' | 'outline' | 'danger' | 'success' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

export default function Button({
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
  const [isHovered, setIsHovered] = React.useState(false)

  const hasBadge = React.Children.toArray(children).some(
    child => React.isValidElement(child) && (child.type as any)?.name === 'Badge'
  ) || (typeof children === 'string' && children.includes('Badge')) // Simple heuristic

  // Note: Since we use standard spans for counts in some places, 
  // let's look for any element that looks like a count badge.
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
          color: theme.colors.background,
        }
      case 'danger':
        return {
          border: `1px solid ${theme.colors.danger}`,
          color: isHovered ? '#fff' : theme.colors.danger,
          background: isHovered ? theme.colors.danger : 'transparent',
        }
      case 'success':
        return {
          border: `1px solid ${theme.colors.success}`,
          color: isHovered ? '#fff' : theme.colors.success,
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
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    opacity: props.disabled ? 0.4 : 1,
    outline: 'none',
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  }

  const renderIcon = () => {
    if (!icon) return null;
    let glowColor = theme.colors.accent;
    if (variant === 'danger') glowColor = theme.colors.danger;
    if (variant === 'success') glowColor = theme.colors.success;

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'filter 0.2s ease-in-out',
        filter: (shouldGlow || (isHovered && ['danger', 'success'].includes(variant))) ? `drop-shadow(0 0 8px ${glowColor})` : 'none'
      }}>
        {icon}
      </div>
    );
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
