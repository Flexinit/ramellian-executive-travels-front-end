import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Checkbox from '../ui/Checkbox';
import Modal from '../ui/Modal';
import RentalTermsList from './RentalTermsList';

const WHO = {
  renter: { label: 'the Terms of Service and the rental terms', audiences: ['Everyone', 'Renters'] },
  owner: { label: 'the Terms of Service and the terms for owners', audiences: ['Everyone', 'Owners'] },
};

/**
 * The tick box someone must check before going on — a renter before booking (checkout), an owner before listing a
 * car (Add Vehicle) — with **Read them** opening the terms that apply to them (the administrators' rental terms for
 * Everyone plus that audience) and a link to the full Terms of Service.
 *
 * @param {'renter'|'owner'} who
 * @param {boolean} checked @param {function} onChange — gets the new value
 * @param {string} [error]
 */
export default function TermsAcceptance({ who = 'renter', checked, onChange, error }) {
  const [reading, setReading] = useState(false);
  const { label, audiences } = WHO[who];

  return (
    <>
      <Checkbox
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        error={error}
        label={
          <span>
            I have read and accept {label}.{' '}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setReading(true);
              }}
              className="text-accent font-semibold underline hover:text-accent-hover focus-ring rounded"
            >
              Read them
            </button>
          </span>
        }
      />
      <Modal isOpen={reading} onClose={() => setReading(false)} title={who === 'owner' ? 'Terms for owners' : 'Rental terms'} size="lg">
        <div className="flex flex-col gap-5">
          <RentalTermsList audiences={audiences} empty={<p className="text-sm text-muted">The full terms are in the Terms of Service.</p>} />
          <p className="text-sm text-muted">
            Also read the full{' '}
            <Link to="/terms" target="_blank" className="text-accent underline">Terms of Service</Link> and{' '}
            <Link to="/privacy" target="_blank" className="text-accent underline">Privacy Policy</Link>.
          </p>
        </div>
      </Modal>
    </>
  );
}
