import React, { useState } from 'react';
import { PenLine, ShieldCheck, Clock } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Checkbox from '../ui/Checkbox';
import Spinner from '../ui/Spinner';
import ContractDocument from './ContractDocument';
import ContractSigningPlace from './ContractSigningPlace';
import { useContract, useOwnerSignContract, renterSignedAt, ownerSignedAt } from '../../hooks/useContract';
import { useFilledContract } from '../../hooks/useFilledContract';
import { useAuthStore } from '../../store/authStore';
import { formatDateTime } from '../../lib/utils';

/**
 * The owner's side of a booking's contract: who has signed and when, and **Read & sign** — the contract read part
 * by part, "I have read and understood" ticked on the last part, then signed in the owner's place (drawn, or with
 * their saved signature) via `POST /payments/contracts/{id}/owner-sign` (live spec 2026-10-16).
 *
 * @param {string} contractId
 * @param {object} booking — a `BookingResponse`
 */
export default function OwnerContractSigning({ contractId, booking }) {
  const { data: contract, isLoading } = useContract(contractId);
  const sign = useOwnerSignContract();
  const me = useAuthStore((s) => s.user);
  const myName = [me?.firstName, me?.lastName].filter(Boolean).join(' ') || me?.email;
  const [open, setOpen] = useState(false);
  const [readToEnd, setReadToEnd] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const text = useFilledContract(booking?.id, contract?.contractText, contract?.acceptedAt, { asOwner: true });

  if (isLoading) return <div className="flex justify-center py-4"><Spinner label="Loading the contract" /></div>;
  if (!contract) return null;

  const renterAt = renterSignedAt(contract);
  const ownerAt = ownerSignedAt(contract);

  const status = (label, at, by) => (
    <p className={`inline-flex items-center gap-1.5 text-sm ${at ? 'text-emerald-400' : 'text-brand-grey'}`}>
      {at ? <ShieldCheck size={14} aria-hidden="true" /> : <Clock size={14} aria-hidden="true" />}
      {label}: {at ? `signed ${formatDateTime(at)}${by ? ` by ${by}` : ''}` : 'not signed yet'}
    </p>
  );

  return (
    <Card className="p-5 flex flex-col gap-3">
      <h2 className="font-heading text-brand-white text-base font-semibold">Rental contract</h2>
      <div className="flex flex-col gap-1">
        {status('Renter', renterAt, contract.renterSignedBy)}
        {status('You (owner)', ownerAt, contract.ownerSignedBy)}
      </div>
      {!ownerAt && (
        <Button className="self-start" onClick={() => setOpen(true)}>
          <PenLine size={15} aria-hidden="true" /> Read &amp; sign
        </Button>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Sign the rental contract" size="xl">
        <div className="flex flex-col gap-4">
          <ContractDocument
            contractText={text}
            reference={booking?.id}
            agreementDate={contract.acceptedAt || contract.reviewedAt}
            renter={{ name: contract.renterSignedBy || booking?.renterName, signedAt: renterAt }}
            owner={{ name: myName, signedAt: ownerAt }}
            staged
            onProgress={({ atEnd }) => atEnd && setReadToEnd(true)}
            ownerSigning={
              confirmed ? (
                <ContractSigningPlace
                  signing={sign.isPending}
                  error={sign.isError ? sign.error : null}
                  onSign={(opts) => sign.mutate({ contractId, ...opts }, { onSuccess: () => setOpen(false) })}
                />
              ) : (
                <p className="mt-2 text-[13px] text-slate-500">Tick "I have read and understood this agreement" below, then sign here.</p>
              )
            }
          />
          {readToEnd && (
            <Checkbox
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              label={<span className="text-brand-white">I have read and understood this agreement, and the details in it are correct.</span>}
            />
          )}
        </div>
      </Modal>
    </Card>
  );
}
