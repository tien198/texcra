import { clsx } from 'clsx'
import { ContactInvitation } from './ContactInvitation'
import { EnquiryForm } from './EnquiryForm'
import { useContactAtmosphere } from './hooks/useContactAtmosphere'
import styles from './contact.module.css'
import { Atmosphere } from '#/components/atmosphere/Atmosphere'

export function ContactSection() {
  const sectionRef = useContactAtmosphere()

  return (
    <section
      ref={sectionRef}
      id="contact"
      className={clsx(
        styles.section,
        'flex items-start md:items-end min-h-[1117px] md:min-h-[976px] px-[24px] md:px-[5%] pt-[220px] md:pt-[72px] pb-[56px] md:pb-[72px] text-[#f7f7f5]',
        '[--atmosphere-height:550px]',
      )}
      aria-labelledby="contact-heading"
    >
      <Atmosphere reverse />
      <div
        className={clsx(
          'grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:grid-cols-[minmax(0,1fr)_576px] items-end gap-[36px] md:gap-[48px] lg:gap-[96px] w-full max-w-[1456px] mx-auto',
        )}
      >
        <ContactInvitation />
        <EnquiryForm />
      </div>
    </section>
  )
}
