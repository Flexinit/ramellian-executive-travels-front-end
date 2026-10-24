import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import DraftNotice from '../components/ui/DraftNotice';
import { useFormDraft } from '../hooks/useFormDraft';

/**
 * Placeholder brand contact details — swap for Ramellian's real phone
 * numbers, email, and WhatsApp line before this ships (docs/requirements.md
 * PUB-05 doesn't specify real values).
 */
const PHONE_NUMBERS = ['+254 700 000 000', '+254 733 000 000'];
const SUPPORT_EMAIL = 'bookings@ramellianexecutivetravels.com';
const WHATSAPP_NUMBER = '254700000000';

const SUBJECT_OPTIONS = [
  { value: 'quote', label: 'Custom Quote Request' },
  { value: 'booking', label: 'Booking Question' },
  { value: 'corporate', label: 'Corporate Account' },
  { value: 'support', label: 'General Support' },
  { value: 'other', label: 'Other' },
];

const schema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  phone: z.string().min(7, 'Enter a valid phone number, e.g. +254 700 000000'),
  subject: z.string().min(1, 'Select a subject'),
  message: z.string().min(10, 'Tell us a bit more — at least 10 characters'),
});

/**
 * Public contact page — WhatsApp quick-link, phone numbers, and an inquiry
 * form (docs/requirements.md PUB-05). There's no backend inquiry endpoint
 * (FRONTEND_INTEGRATION.md documents none), so submitting opens the
 * visitor's email client via a pre-filled `mailto:` link instead of an API
 * call.
 */
export default function ContactPage() {
  const [searchParams] = useSearchParams();
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

  function onSubmit(values) {
    const subjectLabel = SUBJECT_OPTIONS.find((o) => o.value === values.subject)?.label || 'Inquiry';
    const body = `Name: ${values.name}\nEmail: ${values.email}\nPhone: ${values.phone}\n\n${values.message}`;
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      `Ramellian Website — ${subjectLabel}`
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
    toast.success('Your email client should open with your message ready to send.');
    reset({ name: '', email: '', phone: '', subject: '', message: '' });
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
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-emerald-600/10 border border-emerald-500/30 hover:bg-emerald-600/20 text-emerald-600 rounded-xl px-4 py-3 transition-colors focus-ring"
              >
                <MessageCircle size={20} aria-hidden="true" />
                <span className="text-sm font-semibold">Chat with us on WhatsApp</span>
              </a>

              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-start gap-3">
                  <Phone size={16} className="text-accent mt-0.5 shrink-0" aria-hidden="true" />
                  <div className="flex flex-col">
                    {PHONE_NUMBERS.map((phone) => (
                      <a
                        key={phone}
                        href={`tel:${phone.replace(/\s+/g, '')}`}
                        className="text-ink hover:text-accent transition-colors focus-ring rounded-md w-fit"
                      >
                        {phone}
                      </a>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-accent shrink-0" aria-hidden="true" />
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="min-w-0 break-all text-ink hover:text-accent transition-colors focus-ring rounded-md"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={16} className="text-accent shrink-0" aria-hidden="true" />
                  <span className="text-muted">Nairobi, Kenya</span>
                </div>
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
                  label="Phone"
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
                maxLength={1000}
                error={errors.message?.message}
                register={register('message')}
              />
              <Button type="submit" size="lg" className="self-start mt-2">
                Send Message
              </Button>
            </form>
          </Card>
        </div>
      </div>
      </PageWrapper>
    </>
  );
}
