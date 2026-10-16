import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { apiPost } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiError';
import { isValidPhone, normalizePhone, PHONE_HINT } from '../../lib/phone';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Staff create a renter's account for someone (a walk-in or phone booking) — `POST /users/admin/renters`
 * `StaffRenterRequest` { email*, firstName*, lastName*, phoneNumber? } → `StaffRenterResponse` (live spec
 * 2026-10-16), which carries a `temporaryPassword` to hand over, or `accountAlreadyExisted` when that email has an
 * account already. The password is shown once, here.
 *
 * @param {boolean} isOpen @param {function} onClose
 */
export default function AddRenterModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({ email: '', firstName: '', lastName: '', phoneNumber: '' });
  const [errors, setErrors] = useState({});
  const create = useMutation({
    mutationFn: (body) => apiPost('/users/admin/renters', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
  const result = create.data;
  const set = (f) => (e) => setValues((v) => ({ ...v, [f]: e.target.value }));

  function close() {
    setValues({ email: '', firstName: '', lastName: '', phoneNumber: '' });
    setErrors({});
    create.reset();
    onClose();
  }

  function submit(e) {
    e.preventDefault();
    const p = {};
    if (!EMAIL.test(values.email.trim())) p.email = 'Enter a valid email address';
    if (!values.firstName.trim()) p.firstName = 'Enter the first name';
    if (!values.lastName.trim()) p.lastName = 'Enter the last name';
    if (values.phoneNumber.trim() && !isValidPhone(values.phoneNumber)) p.phoneNumber = PHONE_HINT;
    setErrors(p);
    if (Object.keys(p).length) return;
    create.mutate({
      email: values.email.trim(),
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      ...(values.phoneNumber.trim() ? { phoneNumber: normalizePhone(values.phoneNumber) } : {}),
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title="Add a renter">
      {result ? (
        <div className="flex flex-col gap-4">
          {result.accountAlreadyExisted ? (
            <p className="text-sm text-brand-white">
              <span className="font-semibold">{result.email}</span> already has an account — nothing new was created.
              They can sign in as usual, or reset their password from the log-in page.
            </p>
          ) : (
            <>
              <p className="text-sm text-brand-white">
                Account created for <span className="font-semibold">{[result.firstName, result.lastName].filter(Boolean).join(' ')}</span> ({result.email}).
              </p>
              {result.temporaryPassword && (
                <div className="flex flex-col gap-2 rounded-xl border border-brand-gold/30 bg-brand-gold/10 px-4 py-3">
                  <p className="text-xs text-brand-grey">Temporary password — give it to them; it's shown only now. They should change it after signing in.</p>
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-base font-semibold text-brand-white break-all">{result.temporaryPassword}</code>
                    <Button
                      size="sm"
                      onClick={() => navigator.clipboard?.writeText(result.temporaryPassword).then(() => toast.success('Copied.'), () => {})}
                    >
                      <Copy size={13} aria-hidden="true" /> Copy
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
          <Button onClick={close} className="self-end">Done</Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <p className="text-sm text-brand-grey">For someone booking through staff. They get a renter account and a temporary password.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="First name" required value={values.firstName} onChange={set('firstName')} error={errors.firstName} />
            <Input label="Last name" required value={values.lastName} onChange={set('lastName')} error={errors.lastName} />
          </div>
          <Input label="Email" type="email" required value={values.email} onChange={set('email')} error={errors.email} />
          <Input label="Phone number (optional)" type="tel" value={values.phoneNumber} onChange={set('phoneNumber')} error={errors.phoneNumber} />
          {create.isError && <p role="alert" className="text-sm text-red-400">{apiErrorMessage(create.error, "Couldn't create the account.")}</p>}
          <div className="flex gap-3 justify-end">
            <Button onClick={close}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Create account</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
