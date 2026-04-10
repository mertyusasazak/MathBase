// components/features/pdf/ImportReviewModal.tsx
'use client'

import React, { useState } from 'react'
import { CandidateEntry } from '@/types'
import { Button, Badge } from '@/components/ui/Common'
import { theme } from '@/lib/core/theme'
import { X, Check } from 'lucide-react'
import { TYPE_COLORS } from '@/lib/core/constants'

interface ImportReviewModalProps {
  candidates: CandidateEntry[]
  onConfirm: (selected: CandidateEntry[]) => void
  onClose: () => void
}

export default function ImportReviewModal({
  candidates,
  onConfirm,
  onClose
}: ImportReviewModalProps) {
  // Varsayılan olarak tümü seçili başlasın
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(candidates.map((_, i) => i))
  )
  const [isSaving, setIsSaving] = useState(false)

  const toggleSelection = (index: number) => {
    const newKeys = new Set(selectedIndices)
    if (newKeys.has(index)) newKeys.delete(index)
    else newKeys.add(index)
    setSelectedIndices(newKeys)
  }

  const selectAll = () => setSelectedIndices(new Set(candidates.map((_, i) => i)))
  const deselectAll = () => setSelectedIndices(new Set())

  const handleSave = async () => {
    setIsSaving(true)
    const selectedList = candidates.filter((_, i) => selectedIndices.has(i))
    await onConfirm(selectedList)
    setIsSaving(false)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: theme.colors.background,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 16,
        width: '90%',
        maxWidth: 800,
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${theme.colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontFamily: theme.typography.serif, color: theme.colors.text }}>
              PDF İçe Aktarımı Gözden Geçir
            </h2>
            <div style={{ fontSize: '0.8rem', color: theme.colors.textMuted, marginTop: 4 }}>
              {candidates.length} aday blok bulundu, {selectedIndices.size} tanesi seçili
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={selectAll}>Tümünü Seç</Button>
            <Button variant="ghost" size="sm" onClick={deselectAll}>Tümünü Kaldır</Button>
            <Button variant="ghost" size="sm" onClick={onClose} style={{ padding: '8px' }}>
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* List Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          {candidates.length === 0 ? (
            <div style={{ color: theme.colors.textMuted, textAlign: 'center', padding: '40px 0' }}>
              Eşleşen herhangi bir bilgi bloğu (Theorem, Definition vs.) bulunamadı.
            </div>
          ) : (
            candidates.map((cand, i) => {
              const isSelected = selectedIndices.has(i)
              const badgeColor = TYPE_COLORS[cand.type as any] || theme.colors.accent

              return (
                <div key={i} style={{
                  border: `1px solid ${isSelected ? theme.colors.accent : theme.colors.border}`,
                  borderRadius: 12,
                  padding: 16,
                  background: isSelected ? theme.colors.surfaceHover : theme.colors.surface,
                  transition: theme.animations.fast,
                  position: 'relative'
                }}>
                  {/* Select Toggle Button */}
                  <button
                    onClick={() => toggleSelection(i)}
                    style={{
                      position: 'absolute',
                      top: 16, right: 16,
                      width: 24, height: 24,
                      borderRadius: '50%',
                      border: `1px solid ${isSelected ? theme.colors.accent : theme.colors.textMuted}`,
                      background: isSelected ? theme.colors.accent : 'transparent',
                      color: isSelected ? theme.colors.background : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      transition: theme.animations.fast
                    }}
                  >
                    <Check size={14} strokeWidth={3} />
                  </button>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                    <Badge color={badgeColor} variant={isSelected ? 'solid' : 'muted'}>{cand.type}</Badge>
                    <div style={{ flex: 1, paddingRight: 30 }}>
                      <div style={{ fontFamily: theme.typography.serif, fontSize: '1.1rem', fontWeight: 600, color: theme.colors.text }}>
                        {cand.title}
                      </div>
                      {cand.pageHint && (
                        <div style={{ fontSize: '0.7rem', color: theme.colors.textMuted, marginTop: 4 }}>
                          {cand.pageHint}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{
                    fontSize: '0.85rem',
                    color: theme.colors.textDim,
                    lineHeight: 1.5,
                    maxHeight: 100,
                    overflowY: 'auto',
                    fontFamily: theme.typography.sans,
                    padding: '8px 12px',
                    background: theme.colors.background,
                    borderRadius: 6,
                    border: `1px solid ${theme.colors.border}`
                  }}>
                    {cand.content}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${theme.colors.border}`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12
        }}>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>İptal</Button>
          <Button 
            variant="gold" 
            onClick={handleSave} 
            disabled={selectedIndices.size === 0 || isSaving || candidates.length === 0}
          >
            {isSaving ? 'Kaydediliyor...' : `Seçilenleri Kaydet (${selectedIndices.size})`}
          </Button>
        </div>
        
      </div>
    </div>
  )
}
