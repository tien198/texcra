import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { VisualSceneTransition } from '#/components/visual-canvas/VisualScene'

export function useHeroStandardTransition() {
  const transitionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const standardRef = useRef<HTMLDivElement>(null)
  const sceneTransitionRef = useRef<VisualSceneTransition>({
    progress: 0,
    targetX: 0.5,
    targetY: 0.5,
  })

  useEffect(() => {
    const transition = transitionRef.current
    const stage = stageRef.current
    const hero = heroRef.current
    const standard = standardRef.current
    if (!transition || !stage || !hero || !standard) return

    gsap.registerPlugin(ScrollTrigger)
    const media = gsap.matchMedia()

    // Short viewports and reduced motion keep both sections in normal flow.
    media.add(
      '(prefers-reduced-motion: no-preference) and (min-height: 600px)',
      () => {
        transition.dataset.motion = 'true'
        const heroContent = hero.querySelector('[data-hero-content]')
        const content = standard.querySelector('[data-standard-content]')
        const atmosphere = standard.querySelector('[data-atmosphere]')
        const sceneTransition = sceneTransitionRef.current
        let targetClip = ''

        const measure = () => {
          const width = stage.clientWidth
          const height = stage.clientHeight
          const visibleHeight = Math.min(height, window.innerHeight)
          const targetWidth = Math.min(520, width - 40)
          const targetHeight = Math.min(560, visibleHeight - 120)
          const left = Math.min(
            Math.max(20, width * 0.05),
            (width - targetWidth) / 2,
          )
          const right = width - targetWidth - left
          const bottom = (visibleHeight - targetHeight) / 2
          const top = height - visibleHeight + bottom
          targetClip = `inset(${top}px ${right}px ${bottom}px ${left}px round 28px)`

          // Share the same target in canvas coordinates (0–1, from top-left).
          sceneTransition.targetX = (left + targetWidth / 2) / width
          sceneTransition.targetY = (top + targetHeight / 2) / height

          // Let all of a tall Hero scroll into view before the stage sticks.
          const offset = Math.min(0, window.innerHeight - stage.offsetHeight)
          transition.style.setProperty('--stage-top', `${offset}px`)
        }
        measure()

        const updateInteraction = ({ progress }: ScrollTrigger) => {
          // Clipped links must not remain in the keyboard tab order.
          hero.inert = progress > 0.05
          standard.inert = progress < 0.85
        }

        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: transition,
            start: () =>
              `top+=${Math.max(0, stage.offsetHeight - window.innerHeight)} top`,
            end: 'bottom bottom',
            scrub: true,
            invalidateOnRefresh: true,
            onRefreshInit: measure,
            onUpdate: updateInteraction,
            onRefresh: updateInteraction,
          },
        })

        timeline
          .fromTo(
            hero,
            { clipPath: 'inset(0px 0px 0px 0px round 0px)' },
            { clipPath: () => targetClip, duration: 1 },
            0,
          )
          .fromTo(
            sceneTransition,
            { progress: 0 },
            { progress: 1, duration: 1 },
            0,
          )
          .fromTo(heroContent, { opacity: 1 }, { opacity: 0, duration: 0.7 }, 0)
          .fromTo(
            content,
            { opacity: 0, y: 60 },
            { opacity: 1, y: 0, duration: 0.7 },
            0.15,
          )

        // The sticky stage releases when the transition's bottom meets the viewport.
        gsap.fromTo(
          atmosphere,
          { scaleY: 2 },
          {
            scaleY: 0.25,
            ease: 'none',
            scrollTrigger: {
              trigger: transition,
              start: 'bottom bottom',
              end: 'bottom center',
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        )

        const scrollToStandard = () => {
          const trigger = timeline.scrollTrigger
          if (trigger) window.scrollTo({ top: trigger.end, behavior: 'smooth' })
        }
        const onClick = (event: MouseEvent) => {
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            !(event.target instanceof Element) ||
            !event.target.closest('a[href="#standard"]')
          )
            return
          event.preventDefault()
          if (window.location.hash !== '#standard') {
            window.history.pushState(window.history.state, '', '#standard')
          }
          scrollToStandard()
        }
        const onHashChange = () => {
          if (window.location.hash === '#standard') scrollToStandard()
        }

        let active = true
        void document.fonts.ready.then(() => {
          if (!active) return
          ScrollTrigger.refresh()
          onHashChange()
        })
        hero.addEventListener('click', onClick)
        window.addEventListener('hashchange', onHashChange)

        return () => {
          active = false
          hero.removeEventListener('click', onClick)
          window.removeEventListener('hashchange', onHashChange)
          hero.inert = false
          standard.inert = false
          sceneTransition.progress = 0
          delete transition.dataset.motion
          transition.style.removeProperty('--stage-top')
        }
      },
      transition,
    )

    return () => media.revert()
  }, [])

  return { transitionRef, stageRef, heroRef, standardRef, sceneTransitionRef }
}
