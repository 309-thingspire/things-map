'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

type ViewMode = 'map' | 'list'

const Ctx = createContext<{ viewMode: ViewMode; setViewMode: (v: ViewMode) => void }>({
  viewMode: 'map',
  setViewMode: () => {},
})

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  return <Ctx.Provider value={{ viewMode, setViewMode }}>{children}</Ctx.Provider>
}

export const useViewMode = () => useContext(Ctx)
