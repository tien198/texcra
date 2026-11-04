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
  selectTitle,
  selectHeroImage,
  selectSeo,
  selectSnapshot,
  selectAuthors,
  selectCategories,
  selectRelatedPosts,
  selectError,
  selectIsLoaded,
} from '../store'
import type { SEO, DocumentSnapshot } from '#/features/lexical-editor/core/editor-data'
import type { Option } from '#/lib/types/option'

export function useEditorState(postId: string) {
  const dispatch = useAppDispatch()
  const title = useAppSelector(selectTitle)
  const heroImage = useAppSelector(selectHeroImage)
  const seo = useAppSelector(selectSeo)
  const snapshot = useAppSelector(selectSnapshot)
  const authors = useAppSelector(selectAuthors)
  const categories = useAppSelector(selectCategories)
  const relatedPosts = useAppSelector(selectRelatedPosts)
  const error = useAppSelector(selectError)
  const isLoaded = useAppSelector(selectIsLoaded)

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
