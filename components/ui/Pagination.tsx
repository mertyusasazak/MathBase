// app/components/Pagination.tsx
'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    style?: React.CSSProperties
}

export default function Pagination({ currentPage, totalPages, onPageChange, style }: PaginationProps) {
    if (totalPages <= 1) return null

    return (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, ...style }}>
            <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="btn-base btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', fontSize: '0.75rem' }}
            >
                <ChevronLeft size={14} /> Prev
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#7a7870', fontFamily: 'Instrument Sans, sans-serif' }}>
                <span>Page</span>
                <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) onPageChange(Math.min(Math.max(1, val), totalPages));
                    }}
                    onBlur={(e) => {
                        if (!e.target.value) onPageChange(1);
                    }}
                    style={{
                        width: 44,
                        textAlign: 'center',
                        background: 'transparent',
                        border: '1px solid #2a2a33',
                        borderRadius: 6,
                        color: '#c9a84c',
                        fontFamily: 'Instrument Sans, sans-serif',
                        fontSize: '0.8rem',
                        padding: '4px 0',
                        outline: 'none',
                    }}
                    className="no-spinners"
                />
                <span>of {totalPages}</span>
            </div>

            <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="btn-base btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', fontSize: '0.75rem' }}
            >
                Next <ChevronRight size={14} />
            </button>
        </div>
    )
}
