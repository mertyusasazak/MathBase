'use client'

import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from './Common'
import { theme } from '@/lib/core/theme'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  style?: React.CSSProperties
}

export default function Pagination({ currentPage, totalPages, onPageChange, style }: PaginationProps) {
  if (totalPages <= 1) return null

  // Calculate visible page numbers (Sliding Window)
  const getPageRange = () => {
    const delta = 2 // Number of pages before/after current
    const range: (number | string)[] = []
    
    // Always include first page
    range.push(1)

    if (currentPage > delta + 2) {
      range.push('...')
    }

    const start = Math.max(2, currentPage - delta)
    const end = Math.min(totalPages - 1, currentPage + delta)

    for (let i = start; i <= end; i++) {
      range.push(i)
    }

    if (currentPage < totalPages - (delta + 1)) {
      range.push('...')
    }

    // Always include last page
    if (totalPages > 1) {
      range.push(totalPages)
    }

    return range
  }

  const pageRange = getPageRange()

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', ...style }}>
      <div 
        className="glass"
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2, 
          padding: 4, 
          borderRadius: 12,
          boxShadow: 'var(--shadow-md)'
        }}
      >
        {/* FIRST PAGE */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          style={{ width: 32, padding: 0 }}
          icon={<ChevronsLeft size={16} />}
        />

        {/* PREV */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          style={{ width: 32, padding: 0 }}
          icon={<ChevronLeft size={16} />}
        />

        {/* PAGE NUMBERS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {pageRange.map((page, idx) => (
            typeof page === 'number' ? (
              <Button
                key={idx}
                variant={currentPage === page ? 'gold-solid' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(page)}
                style={{ 
                  minWidth: 32, 
                  height: 32, 
                  padding: '0 8px',
                  fontSize: '0.85rem',
                  fontWeight: currentPage === page ? 700 : 500,
                  borderRadius: 6
                }}
              >
                {page}
              </Button>
            ) : (
              <span key={idx} style={{ color: theme.colors.textDim, padding: '0 4px', fontSize: '0.9rem' }}>
                {page}
              </span>
            )
          ))}
        </div>

        {/* NEXT */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          style={{ width: 32, padding: 0 }}
          icon={<ChevronRight size={16} />}
        />

        {/* LAST PAGE */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          style={{ width: 32, padding: 0 }}
          icon={<ChevronsRight size={16} />}
        />
      </div>
    </div>
  )
}
