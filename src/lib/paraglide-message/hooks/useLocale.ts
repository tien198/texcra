'use client'

import { useSyncExternalStore } from 'react'

import {
  baseLocale,
  getLocale,
  setLocale as setParaglideLocale,
  type Locale,
} from '#/paraglide/runtime'

const localeListeners = new Set<() => void>()

function subscribeToLocale(listener: () => void) {
  localeListeners.add(listener)
  return () => localeListeners.delete(listener)
}

function getServerLocale(): Locale {
  return baseLocale
}

export function useLocale() {
  return useSyncExternalStore(subscribeToLocale, getLocale, getServerLocale)
}

export function setLocale(nextLocale: Locale) {
  const result = setParaglideLocale(nextLocale, { reload: false })
  const notifyListeners = () =>
    localeListeners.forEach((listener) => listener())

  if (result instanceof Promise) {
    return result.then(notifyListeners)
  }

  notifyListeners()
}
