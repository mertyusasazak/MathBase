'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'
import Input from './Input'
import { theme } from '@/lib/core/theme'

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
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                icon={<ChevronLeft size={14} />}
            >
                Prev
            </Button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: theme.colors.textMuted, fontFamily: theme.typography.sans }}>
                <span>Page</span>
                <Input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) onPageChange(Math.min(Math.max(1, val), totalPages));
                    }}
                    style={{
                        width: 50,
                        textAlign: 'center',
                        color: theme.colors.accent,
                        padding: '4px 0',
                    }}
                />
                <span>of {totalPages}</span>
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                icon={<ChevronRight size={14} />}
                iconPosition="right"
            >
                Next
            </Button>
        </div>
    )
}
