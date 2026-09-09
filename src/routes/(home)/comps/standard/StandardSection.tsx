import { clsx } from 'clsx'
import { m } from '#/paraglide/messages.js'
import { Atmosphere } from '../shared/Atmosphere'
import { StandardStatement } from './StandardStatement'

export function StandardSection() {
  return (
    <section
      id="standard"
      className={clsx(
        'relative isolate flex items-center min-h-[760px] md:min-h-[1379px] px-6 py-16 md:py-[96px] md:pb-[80px] md:px-[5%] text-[#17242b]',
        'bg-[radial-gradient(ellipse_100%_130%_at_50%_-30%,#c4d5e7_45%,#fdfbf7_85%,#f7f7f5)]',
        '[--atmosphere-height:380px] [--atmosphere-opacity:0.72] [--join-height:180px]',
        'md:[--atmosphere-height:680px] md:[--atmosphere-opacity:0.88] md:[--join-height:300px]',
      )}
      aria-labelledby="standard-heading"
    >
      <Atmosphere />
      <div
        data-standard-content
        className={clsx(
          'grid grid-cols-1 md:grid-cols-[1fr_2fr] lg:grid-cols-[312px_minmax(0,693px)] items-center gap-[28px] md:gap-12 lg:gap-[96px] w-full max-w-[1101px] mx-auto',
        )}
      >
        <p
          className={clsx(
            'text-[#4b555a] font-heading font-[200] text-[10px] tracking-[2.4px]',
          )}
        >
          {m.home_standard_eyebrow()}
        </p>
        <StandardStatement />
      </div>
    </section>
  )
}
