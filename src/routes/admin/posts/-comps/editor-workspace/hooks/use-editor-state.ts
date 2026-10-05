import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '#/app/hooks'
import {
  setPostId,
  setTitle,
  setHeroImage,
  setSeo,
  setSnapshot,
  setAuthors,
  setCategories,
  setRelatedPosts,
} from '#/lexical/editor-RTK/editorSlice'
import type { SEO, DocumentSnapshot } from '#/lexical/core/-editor-data'
import type { Option } from '#/components/texcra-ui/relationship-multi-select'

export function useEditorState(postId: string) {
  const dispatch = useAppDispatch()
  const title = useAppSelector((state) => state.editor.title)
  const heroImage = useAppSelector((state) => state.editor.heroImage)
  const seo = useAppSelector((state) => state.editor.seo)
  const snapshot = useAppSelector((state) => state.editor.snapshot)
  const authors = useAppSelector((state) => state.editor.authors)
  const categories = useAppSelector((state) => state.editor.categories)
  const relatedPosts = useAppSelector((state) => state.editor.relatedPosts)
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

  const handleAuthorsChange = useCallback(
    (newAuthors: Option[]) => {
      dispatch(setAuthors(newAuthors))
    },
    [dispatch],
  )

  const handleCategoriesChange = useCallback(
    (newCategories: Option[]) => {
      dispatch(setCategories(newCategories))
    },
    [dispatch],
  )

  const handleRelatedPostsChange = useCallback(
    (newRelatedPosts: Option[]) => {
      dispatch(setRelatedPosts(newRelatedPosts))
    },
    [dispatch],
  )

  return {
    dispatch,
    title,
    heroImage,
    seo,
    snapshot,
    authors,
    categories,
    relatedPosts,
    error,
    isLoaded,
    handleTitleChange,
    handleHeroImageChange,
    handleSeoChange,
    handleSnapshotChange,
    handleAuthorsChange,
    handleCategoriesChange,
    handleRelatedPostsChange,
  }
}
