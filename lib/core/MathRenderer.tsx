import React, { useEffect, useRef } from 'react'
import { theme } from './theme'
import { renderContent } from './math'

interface MathRendererProps {
  content: string
  style?: React.CSSProperties
}

/**
 * A React component for rendering complex mathematical metadata/content.
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ content, style }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = renderContent(content)
  }, [content])

  return (
    <div
      ref={containerRef}
      style={{
        fontFamily: theme.typography.serif,
        fontSize: '1.05rem',
        lineHeight: 1.78,
        color: theme.colors.text,
        ...style
      }}
    />
  )
}
