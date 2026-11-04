import {
  combineSlices,
  configureStore,
  createListenerMiddleware,
} from '@reduxjs/toolkit'

// Declaration merging target for feature slices that call `slice.injectInto(rootReducer)`.
// Keeping `rootReducer` empty at initialization makes feature slices 100% tree-shakable
// while preserving `<StoreProvider>` globally in `src/routes/__root.tsx`.
export interface LazyLoadedSlices {}

export const rootReducer =
  combineSlices().withLazyLoadedSlices<LazyLoadedSlices>()

export const listenerMiddleware = createListenerMiddleware()

export const makeStore = () =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(listenerMiddleware.middleware),
  })

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = AppStore['dispatch']
export const startAppListening = listenerMiddleware.startListening.withTypes<
  RootState,
  AppDispatch
>()
