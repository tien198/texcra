import { clsx } from 'clsx'
import { ContactInvitation } from './ContactInvitation'
import { EnquiryForm } from './EnquiryForm'

export function ContactSection() {
  return (
    <section
      id="contact"
      className={clsx(
        'relative isolate flex items-start md:items-end min-h-[1117px] md:min-h-[976px] px-[24px] md:px-[5%] pt-[220px] md:pt-[72px] pb-[56px] md:pb-[72px] bg-[#f7f7f5] text-[#f7f7f5]'
      )}
      aria-labelledby="contact-heading"
    >
      <div
        className={clsx(
          'absolute z-[-1] inset-[0_0_0] md:inset-[95px_0_0] bg-[url(/images/gradient-dark-transparent-reversed-mobile.png)] md:bg-[url(/images/gradient-dark-transparent-reversed.png)] bg-center bg-[100%_100%] bg-no-repeat pointer-events-none'
        )}
        aria-hidden="true"
      />
      <div
        className={clsx(
          'grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:grid-cols-[minmax(0,1fr)_576px] items-end gap-[36px] md:gap-[48px] lg:gap-[96px] w-full max-w-[1456px] mx-auto'
        )}
      >
        <ContactInvitation />
        <EnquiryForm />
      </div>
    </section>
  )
}
