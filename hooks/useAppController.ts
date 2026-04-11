'use client'

import { useAppContext, THEME_COLORS, AccentColor } from '@/lib/context/AppContext'

/**
 * useAppController now acts as a stable wrapper around AppContext
 * to maintain backward compatibility with existing components.
 */
export function useAppController() {
  return useAppContext()
}

export { THEME_COLORS }
export type { AccentColor }
