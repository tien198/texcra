import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function useExpertiseAtmosphere() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const atmosphere = section?.querySelector('[data-atmosphere]')
    if (!section || !atmosphere) return

    gsap.registerPlugin(ScrollTrigger)
    const media = gsap.matchMedia()

    media.add(
      {
        allowMotion: '(prefers-reduced-motion: no-preference)',
        // Rebuild the tween when the CSS atmosphere height changes at 768px.
        isDesktop: '(min-width: 768px)',
      },
      (context) => {
        if (!context.conditions?.allowMotion) return

        const initialHeight = Number.parseFloat(
          getComputedStyle(atmosphere).height,
        )

        gsap.fromTo(
          atmosphere,
          { height: initialHeight },
          {
            height: initialHeight * 3,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'bottom bottom',
              scrub: true,
            },
          },
        )
      },
      section,
    )

    return () => media.revert()
  }, [])

  return sectionRef
}
