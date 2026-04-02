'use client'

import React from 'react'
import { theme } from '@/lib/core/theme'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'outline' | 'solid' | 'ghost'
  padding?: string | number
  borderRadius?: string | number
}

export default function Card({
  variant = 'outline',
  padding = 16,
  borderRadius = 12,
  children,
  style,
  ...props
}: CardProps) {
  const baseStyle: React.CSSProperties = {
    background: variant === 'solid' ? theme.colors.surface : (variant === 'ghost' ? 'transparent' : theme.colors.surface),
    border: variant === 'outline' ? `1px solid ${theme.colors.border}` : '1px solid transparent',
    borderRadius,
    padding,
    overflow: 'hidden',
    ...style,
  }

  return (
    <div style={baseStyle} {...props}>
      {children}
    </div>
  )
}
