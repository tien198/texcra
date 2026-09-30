'use client'

import * as React from 'react'

export const DrawerDepthContext = React.createContext(0)

export function DrawerDepthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const depth = React.useContext(DrawerDepthContext)
  return (
    <DrawerDepthContext.Provider value={depth + 1}>
      {children}
    </DrawerDepthContext.Provider>
  )
}

export function useDrawerDepth() {
  return React.useContext(DrawerDepthContext)
}
