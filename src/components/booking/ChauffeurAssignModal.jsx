import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useAssignChauffeur } from '../../hooks/useBookings';

/**
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {string} bookingId
 * @param {string} [currentChauffeur]
 */
export default function ChauffeurAssignModal({ isOpen, onClose, bookingId, currentChauffeur }) {
  const [name, setName] = useState(currentChauffeur || '');
  const assign = useAssignChauffeur();

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    assign.mutate({ bookingId, chauffeurName: name.trim() }, { onSuccess: onClose });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Chauffeur">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Chauffeur Name"
          name="chauffeurName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. John Kamau"
        />
        <div className="flex gap-3 justify-end">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={assign.isPending} disabled={!name.trim()}>
            Assign
          </Button>
        </div>
      </form>
    </Modal>
  );
}
