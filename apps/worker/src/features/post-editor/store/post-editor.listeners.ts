import { isAnyOf } from '@reduxjs/toolkit'
import { startAppListening } from '#/app/store'
import {
  setTitle,
  setHeroImage,
  setSeo,
  setSnapshot,
  setStatus,
  setError,
} from './post-editor.slice'
import { getDraftStorageKey } from '#/features/lexical-editor/core/editor-data'

export function setupPostEditorListeners() {
  return startAppListening({
    matcher: isAnyOf(setTitle, setHeroImage, setSeo, setSnapshot),
    effect: async (_action, listenerApi) => {
      listenerApi.cancelActiveListeners()

      const state = listenerApi.getState()
      const editor = state.editor
      if (!editor || !editor.isLoaded || !editor.snapshot || editor.error || !editor.postId) return

      const { title, heroImage, seo, snapshot, postId } = editor
      listenerApi.dispatch(setStatus('Saving…'))

      try {
        await listenerApi.condition(
          (action) => action.type === 'editor/setPostId',
          500,
        )
      } catch {
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
        const currentState = listenerApi.getState()
        if (currentState.editor?.postId === postId) {
          listenerApi.dispatch(setStatus('Saved on this device'))
          listenerApi.dispatch(setError(''))
        }
      } catch {
        const currentState = listenerApi.getState()
        if (currentState.editor?.postId === postId) {
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
}

// Register listeners when the store module is evaluated
setupPostEditorListeners()
