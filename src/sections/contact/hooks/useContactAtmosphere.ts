import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function useContactAtmosphere() {
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

        // The reversed atmosphere stays bottom-anchored as it grows upward.
        gsap.fromTo(
          atmosphere,
          { height: initialHeight },
          {
            height: initialHeight * 4,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'clamp(top bottom)',
              end: 'clamp(bottom bottom)',
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
