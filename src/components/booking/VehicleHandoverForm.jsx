import React, { useState } from 'react';
import { Check } from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import ToggleChip from '../ui/ToggleChip';
import SignaturePad from '../payment/SignaturePad';
import { FUEL_LEVELS, FUEL_LEVEL_LABELS } from '../../lib/constants';

const FUEL_OPTIONS = Object.values(FUEL_LEVELS).map((value) => ({ value, label: FUEL_LEVEL_LABELS[value] }));

/**
 * The shared pickup/return handover form: odometer reading, fuel level, condition notes, an optional
 * damage flag with its own description, where the handover happened, and a signature acknowledging them —
 * matching `vehicle-handover-controller`'s real pickup/dropoff contract in the live OpenAPI spec. The
 * backend only accepts this from the renter (a 403 otherwise — see docs/backend-requests.md item 22's
 * follow-up), so it's the renter filling this in; the signature is whoever is physically there alongside
 * them at the handover (the owner or their dispatcher/chauffeur) co-signing to agree the details are
 * accurate, the same two-sided sign-off `ContractViewer`/`SignaturePad` already use for the rental contract
 * itself — one side alone recording this gives the other nothing to dispute it with later.
 *
 * @param {'pickup'|'return'} type
 * @param {function} onSubmit — ({ odometerReading, fuelLevel, conditionNotes, damageNoted, damageDescription, location, signature })
 * @param {boolean} [pending]
 */
export default function VehicleHandoverForm({ type, onSubmit, pending }) {
  const [odometerReading, setOdometerReading] = useState('');
  const [fuelLevel, setFuelLevel] = useState('');
  const [conditionNotes, setConditionNotes] = useState('');
  const [damageNoted, setDamageNoted] = useState(false);
  const [damageDescription, setDamageDescription] = useState('');
  const [location, setLocation] = useState('');
  const [signature, setSignature] = useState(null);

  const odometerValid = odometerReading !== '' && Number(odometerReading) >= 0;
  const valid = odometerValid && !!fuelLevel && !!signature;

  function handleSubmit(e) {
    e.preventDefault();
    if (!valid) return;
    onSubmit({
      odometerReading: Number(odometerReading),
      fuelLevel,
      conditionNotes,
      damageNoted,
      damageDescription: damageNoted ? damageDescription : '',
      location,
      signature,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-brand-grey">
        Record the vehicle&apos;s condition {type === 'pickup' ? 'as you collect it' : 'as you return it'}, then have
        the owner or their dispatcher sign below to confirm it&apos;s accurate.
      </p>

      <Input
        label="Odometer reading (km)"
        name="odometerReading"
        type="number"
        min="0"
        inputMode="numeric"
        value={odometerReading}
        onChange={(e) => setOdometerReading(e.target.value)}
        required
      />

      <Select
        label="Fuel level"
        name="fuelLevel"
        options={FUEL_OPTIONS}
        value={fuelLevel}
        onChange={(e) => setFuelLevel(e.target.value)}
      />

      <Textarea
        label="Condition notes"
        name="conditionNotes"
        rows={3}
        maxLength={1000}
        placeholder={type === 'pickup' ? 'e.g. small scratch on rear bumper' : 'e.g. returned clean, no new damage'}
        value={conditionNotes}
        onChange={(e) => setConditionNotes(e.target.value)}
      />

      <Input
        label="Location (optional)"
        name="location"
        placeholder="e.g. JKIA Terminal 1A"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm text-brand-white font-medium">Damage noted?</span>
        <div className="flex gap-2">
          <ToggleChip active={!damageNoted} onClick={() => setDamageNoted(false)}>
            No
          </ToggleChip>
          <ToggleChip active={damageNoted} onClick={() => setDamageNoted(true)}>
            Yes
          </ToggleChip>
        </div>
      </div>

      {damageNoted && (
        <Textarea
          label="Damage description"
          name="damageDescription"
          rows={2}
          maxLength={1000}
          placeholder="Describe the damage"
          value={damageDescription}
          onChange={(e) => setDamageDescription(e.target.value)}
          required
        />
      )}

      <SignaturePad onChange={setSignature} />

      <Button type="submit" size="lg" disabled={!valid} loading={pending}>
        {!pending && <Check size={16} aria-hidden="true" />}
        {type === 'pickup' ? 'Confirm Pickup' : 'Confirm Return'}
      </Button>
    </form>
  );
}
