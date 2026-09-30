import {
  configureStore,
  createListenerMiddleware,
  isAnyOf,
} from '@reduxjs/toolkit'
import editorReducer, {
  setTitle,
  setHeroImage,
  setSeo,
  setSnapshot,
  setStatus,
  setError,
} from '#/lexical/editor-RTK/editorSlice'
import { getDraftStorageKey } from '#/lexical/core/-editor-data'

const listenerMiddleware = createListenerMiddleware()

listenerMiddleware.startListening({
  matcher: isAnyOf(setTitle, setHeroImage, setSeo, setSnapshot),
  effect: async (_action, listenerApi) => {
    listenerApi.cancelActiveListeners()

    const state = listenerApi.getState() as RootState
    const { title, heroImage, seo, snapshot, error, isLoaded, postId } =
      state.editor
    if (!isLoaded || !snapshot || error || !postId) return

    listenerApi.dispatch(setStatus('Saving…'))

    try {
      await listenerApi.condition(
        (action) => action.type === 'editor/setPostId',
        500,
      )
    } catch {
      // Throws if cancelled by another setTitle/setHeroImage/setSeo/setSnapshot
      return
    }

    const pending = JSON.stringify({
      version: 1,
      title,
      heroImage,
      seo,
      editor: JSON.stringify(snapshot.json),
    })

    const storageKey = getDraftStorageKey(postId)

    try {
      localStorage.setItem(storageKey, pending)

      const currentState = listenerApi.getState() as RootState
      if (currentState.editor.postId === postId) {
        listenerApi.dispatch(setStatus('Saved on this device'))
        listenerApi.dispatch(setError(''))
      }
    } catch {
      const currentState = listenerApi.getState() as RootState
      if (currentState.editor.postId === postId) {
        listenerApi.dispatch(setStatus('Not saved'))
        listenerApi.dispatch(
          setError(
            'This browser could not save your draft. Export your HTML to keep a copy.',
          ),
        )
      }
    }
  },
})

export const makeStore = () =>
  configureStore({
    reducer: {
      editor: editorReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(listenerMiddleware.middleware),
  })

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
