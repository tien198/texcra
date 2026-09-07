import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import type { FormEvent } from 'react'
import { m } from '#/paraglide/messages.js'
import { ContactField } from './ContactField'
import { ProjectTypeSelector } from './ProjectTypeSelector'
import styles from './contact.module.css'

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
      className={styles.form}
      onSubmit={handleSubmit}
      aria-labelledby="enquiry-title"
      aria-busy={status === 'submitting'}
    >
      <h3 id="enquiry-title">{m.contact_form_title()}</h3>
      <div className={styles.details}>
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
      <label className={styles.brief}>
        <span>{m.contact_brief_label()}</span>
        <textarea
          name="brief"
          placeholder={m.contact_brief_placeholder()}
          required
          maxLength={10000}
          rows={3}
        />
      </label>
      <button
        type="submit"
        className={styles.submit}
        disabled={status === 'submitting'}
      >
        {status === 'submitting'
          ? m.contact_submitting()
          : status === 'error'
            ? m.contact_retry()
            : m.contact_submit()}
        <ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <p className={styles.feedback} role="status" aria-live="polite">
        {feedback}
      </p>
    </form>
  )
}
