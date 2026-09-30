import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '#/app/hooks'
import {
  setPostId,
  setTitle,
  setHeroImage,
  setSeo,
  setSnapshot,
} from '#/lexical/editor-RTK/editorSlice'
import type { SEO, DocumentSnapshot } from '#/lexical/core/-editor-data'

export function useEditorState(postId: string) {
  const dispatch = useAppDispatch()
  const title = useAppSelector((state) => state.editor.title)
  const heroImage = useAppSelector((state) => state.editor.heroImage)
  const seo = useAppSelector((state) => state.editor.seo)
  const snapshot = useAppSelector((state) => state.editor.snapshot)
  const error = useAppSelector((state) => state.editor.error)
  const isLoaded = useAppSelector((state) => state.editor.isLoaded)

  useEffect(() => {
    dispatch(setPostId(postId))
  }, [dispatch, postId])

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      dispatch(setTitle(newTitle))
    },
    [dispatch],
  )

  const handleHeroImageChange = useCallback(
    (url: string | null) => {
      dispatch(setHeroImage(url))
    },
    [dispatch],
  )

  const handleSeoChange = useCallback(
    (newSeo: Partial<SEO>) => {
      dispatch(setSeo(newSeo))
    },
    [dispatch],
  )

  const handleSnapshotChange = useCallback(
    (newSnapshot: DocumentSnapshot) => {
      dispatch(setSnapshot(newSnapshot))
    },
    [dispatch],
  )

  return {
    dispatch,
    title,
    heroImage,
    seo,
    snapshot,
    error,
    isLoaded,
    handleTitleChange,
    handleHeroImageChange,
    handleSeoChange,
    handleSnapshotChange,
  }
}
