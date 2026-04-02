'use client'

import { useState } from 'react'

export function useSidebarLogic() {
  const [logoHover, setLogoHover] = useState(false)

  return {
    state: {
      logoHover
    },
    actions: {
      setLogoHover
    }
  }
}
