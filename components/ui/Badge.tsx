'use client'

import React from 'react'
import { theme } from '@/lib/core/theme'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: string
  variant?: 'solid' | 'outline' | 'muted'
}

export default function Badge({
  color = theme.colors.accent,
  variant = 'muted',
  children,
  style,
  ...props
}: BadgeProps) {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'solid':
        return { background: color, color: theme.colors.background, border: `1px solid ${color}` }
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
