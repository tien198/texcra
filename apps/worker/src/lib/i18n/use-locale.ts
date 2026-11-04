'use client'

import { useSyncExternalStore } from 'react'

import type { Locale } from '#/paraglide/runtime'
import {
  baseLocale,
  getLocale,
  setLocale as setParaglideLocale,
} from '#/paraglide/runtime'

const localeListeners = new Set<() => void>()
let clientLocale: Locale | undefined

function subscribeToLocale(listener: () => void) {
  localeListeners.add(listener)
  return () => localeListeners.delete(listener)
}

function getServerLocale(): Locale {
  return baseLocale
}

function getClientLocale(): Locale {
  return clientLocale ?? getLocale()
}

export function useLocale() {
  return useSyncExternalStore(
    subscribeToLocale,
    getClientLocale,
    getServerLocale,
  )
}

export function setLocale(nextLocale: Locale) {
  const result = setParaglideLocale(nextLocale, { reload: false })
  const notifyListeners = () => {
    // The URL strategy does not store a new locale when reload is disabled.
    // Keep the selection in this client store for the reactive message UI.
    if (typeof document !== 'undefined') {
      clientLocale = nextLocale
      document.documentElement.lang = nextLocale
    }
    localeListeners.forEach((listener) => listener())
  }

  if (result instanceof Promise) {
    return result.then(notifyListeners)
  }

  notifyListeners()
}
