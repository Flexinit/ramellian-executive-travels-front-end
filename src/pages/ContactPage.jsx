import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Phone, Mail, MapPin, MessageCircle, Globe } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import DraftNotice from '../components/ui/DraftNotice';
import { useFormDraft } from '../hooks/useFormDraft';
import { useContactDetails } from '../hooks/usePlatformSettings';
import { useMutation } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { apiPost } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';


const SUBJECT_OPTIONS = [
  { value: 'quote', label: 'Custom Quote Request' },
  { value: 'booking', label: 'Booking Question' },
  { value: 'corporate', label: 'Corporate Account' },
  { value: 'support', label: 'General Support' },
  { value: 'other', label: 'Other' },
];

/** `ContactRequest` (live spec 2026-10-26): name, email, subject and message required; phone optional; these lengths. */
const schema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(100, 'Keep it under 100 characters'),
  email: z.string().trim().min(1, 'Email is required').max(200, 'Keep it under 200 characters').email('Enter a valid email address'),
  phone: z.string().trim().optional(),
  subject: z.string().min(1, 'Select a subject'),
  message: z.string().trim().min(1, 'Write your message').max(5000, 'Keep it under 5,000 characters'),
});

/**
 * Public contact page — WhatsApp quick-link, phone, email, address and social links, and an inquiry form
 * (docs/requirements.md PUB-05). The details are the ones an administrator sets under Platform Settings → Contact &
 * social (`useContactDetails`); anything not set isn't shown — the page used to show placeholder numbers. There's no
 * form sends the message to the team through the backend — `POST /contact` `ContactRequest` (live spec 2026-10-26;
 * it used to open the visitor's email app instead).
 */
export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const contact = useContactDetails();
  const defaultSubject = searchParams.get('type') === 'quote' ? 'quote' : '';

  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    // Every field has a default, so an emptied form reads as pristine (not "dirty") and the draft clears properly.
    defaultValues: { name: '', email: '', phone: '', message: '', subject: defaultSubject },
  });
  // A half-written message survives a reload; dropped once sent (the form resets).
  const { restored, discard } = useFormDraft({
    key: 'contact',
    watch,
    getValues,
    setValue,
    isDirty,
    resetToBase: () => reset({ name: '', email: '', phone: '', message: '', subject: defaultSubject }),
  });

  const send = useMutation({
    mutationFn: (payload) => apiPost('/contact', payload),
    onSuccess: () => {
      toast.success("Message sent — we'll get back to you within one business day.");
      reset({ name: '', email: '', phone: '', subject: '', message: '' });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't send your message. Please try again.")),
  });

  function onSubmit(values) {
    // The subject goes as its words ("Custom Quote Request"), not the form's internal value.
    const subject = SUBJECT_OPTIONS.find((o) => o.value === values.subject)?.label || 'Inquiry';
    send.mutate({
      name: values.name,
      email: values.email,
      ...(values.phone ? { phone: values.phone } : {}),
      subject,
      message: values.message,
    });
  }

  return (
    <>
      <PageWrapper>
      <PageTitle title="Contact Us" />
      <div className="flex flex-col gap-10">
        <div className="flex flex-col items-center text-center gap-2">
          <span className="text-brand-gold-deep text-xs font-semibold tracking-widest uppercase">Get In Touch</span>
          <h1 className="font-heading text-ink text-3xl sm:text-4xl font-bold">Contact Us</h1>
          <p className="text-muted text-sm max-w-xl">
            Questions, custom quotes, or corporate accounts — reach us any way that&apos;s convenient.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6 items-start">
          <div className="flex flex-col gap-4">
            <Card className="p-6 flex flex-col gap-4">
              {contact.whatsapp && (
                <a
                  href={contact.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-emerald-600/10 border border-emerald-500/30 hover:bg-emerald-600/20 text-emerald-600 rounded-xl px-4 py-3 transition-colors focus-ring"
                >
                  <MessageCircle size={20} aria-hidden="true" />
                  <span className="text-sm font-semibold">Chat with us on WhatsApp</span>
                </a>
              )}

              <div className="flex flex-col gap-3 text-sm">
                {contact.phone && (
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-accent shrink-0" aria-hidden="true" />
                    <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="text-ink hover:text-accent transition-colors focus-ring rounded-md w-fit">
                      {contact.phone}
                    </a>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-accent shrink-0" aria-hidden="true" />
                    <a href={`mailto:${contact.email}`} className="min-w-0 [overflow-wrap:anywhere] text-ink hover:text-accent transition-colors focus-ring rounded-md">
                      {contact.email}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <MapPin size={16} className="text-accent shrink-0" aria-hidden="true" />
                  <span className="text-muted">{contact.address || 'Nairobi, Kenya'}</span>
                </div>
                {contact.socials.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Globe size={16} className="text-accent mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {contact.socials.map((social) => (
                        <a key={social.key} href={social.href} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-accent transition-colors focus-ring rounded-md">
                          {social.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <Card className="p-6 sm:p-8">
            {restored && <DraftNotice onDiscard={discard} />}
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Full Name" autoComplete="name" error={errors.name?.message} register={register('name')} />
                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  error={errors.email?.message}
                  register={register('email')}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Phone (optional)"
                  type="tel"
                  autoComplete="tel"
                  error={errors.phone?.message}
                  register={register('phone')}
                />
                <Select
                  label="Subject"
                  options={SUBJECT_OPTIONS}
                  error={errors.subject?.message}
                  register={register('subject')}
                />
              </div>
              <Textarea
                label="Message"
                maxLength={5000}
                error={errors.message?.message}
                register={register('message')}
              />
              <Button type="submit" size="lg" className="self-start mt-2" loading={send.isPending}>
                {!send.isPending && <Send size={16} aria-hidden="true" />} Send Message
              </Button>
            </form>
          </Card>
        </div>
      </div>
      </PageWrapper>
    </>
  );
}
