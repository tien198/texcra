import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import type { FormEvent } from 'react'
import { m } from '#/paraglide/messages.js'
import { ContactField } from './ContactField'
import { ProjectTypeSelector } from './ProjectTypeSelector'
import { clsx } from 'clsx'

export type ProjectEnquiry = {
  name: string
  email: string
  projectType: string
  brief: string
}
type EnquiryFormProps = { onSend?: (enquiry: ProjectEnquiry) => Promise<void> }

export function EnquiryForm({ onSend }: EnquiryFormProps) {
  const [status, setStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error' | 'unavailable' | 'invalid'
  >('idle')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'submitting') return
    const form = event.currentTarget
    const data = new FormData(form)
    const enquiry = {
      name: String(data.get('name') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      projectType: String(data.get('projectType') ?? ''),
      brief: String(data.get('brief') ?? '').trim(),
    }
    if (!enquiry.name || !enquiry.email || !enquiry.brief) {
      setStatus('invalid')
      return
    }
    if (!onSend) {
      setStatus('unavailable')
      return
    }
    setStatus('submitting')
    try {
      await onSend(enquiry)
      setStatus('success')
      form.reset()
    } catch {
      setStatus('error')
    }
  }

  const feedback =
    status === 'unavailable'
      ? m.contact_delivery_unavailable()
      : status === 'error'
        ? m.contact_delivery_error()
        : status === 'invalid'
          ? m.contact_required_error()
          : status === 'success'
            ? m.contact_delivery_success()
            : ''

  return (
    <form
      className={clsx(
        'flex flex-col gap-[22px] min-w-0 p-[24px] md:p-[32px] border border-[#ddebeb66] border-t-[#f1f7f680] rounded-[6px] bg-[linear-gradient(135deg,#ffffff1f,#bde7f20d_34%,#ffffff08_68%,#8eb7c814)] backdrop-blur-[24px] shadow-[0_18px_48px_-12px_#000b1266]',
      )}
      onSubmit={handleSubmit}
      aria-labelledby="enquiry-title"
      aria-busy={status === 'submitting'}
    >
      <h3
        id="enquiry-title"
        className={clsx(
          'font-ibm-plex-sans-condensed font-[200] text-[23px] md:text-[24px] tracking-[1.2px] md:tracking-[2.2px]',
        )}
      >
        {m.contact_form_title()}
      </h3>
      <div
        className={clsx(
          'grid grid-cols-1 lg:grid-cols-2 gap-[22px] md:gap-[24px]',
        )}
      >
        <ContactField
          name="name"
          label={m.contact_name_label()}
          placeholder={m.contact_name_placeholder()}
          autoComplete="name"
        />
        <ContactField
          name="email"
          label={m.contact_email_label()}
          placeholder={m.contact_email_placeholder()}
          type="email"
          autoComplete="email"
        />
      </div>
      <ProjectTypeSelector />
      <label className={clsx('flex flex-col gap-[14px]')}>
        <span className={clsx('text-[13px]')}>{m.contact_brief_label()}</span>
        <textarea
          className={clsx(
            'resize-y w-full h-[96px] min-h-[96px] p-[18px] border border-[#aec2d050] rounded-none bg-[#06182818] text-ivory text-[15px] leading-[1.65] placeholder:text-[#8ca0b0] placeholder:opacity-100',
          )}
          name="brief"
          placeholder={m.contact_brief_placeholder()}
          required
          maxLength={10000}
          rows={3}
        />
      </label>
      <button
        type="submit"
        className={clsx(
          'flex items-center justify-between gap-[32px] self-stretch md:self-start min-h-[55px] px-[24px] py-[18px] border-0 rounded-[2px] bg-[#bddfff] hover:bg-[#d5eaff] disabled:opacity-65 disabled:cursor-wait text-primary text-[13px] font-[600] cursor-pointer',
        )}
        disabled={status === 'submitting'}
      >
        {status === 'submitting'
          ? m.contact_submitting()
          : status === 'error'
            ? m.contact_retry()
            : m.contact_submit()}
        <ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <p
        className={clsx(
          'empty:hidden text-[#d8e7f1] text-[13px] leading-[1.65]',
        )}
        role="status"
        aria-live="polite"
      >
        {feedback}
      </p>
    </form>
  )
}
