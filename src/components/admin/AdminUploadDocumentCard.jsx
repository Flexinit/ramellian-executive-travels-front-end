import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../ui/Card';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { apiUpload } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiError';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from '../../lib/constants';

/**
 * Staff upload a document for this user — e.g. a copy of their ID handed in at the office —
 * `POST /documents/admin/users/{userId}?documentType=…` (multipart `file`, live spec 2026-10-16) → `DocumentResponse`.
 * It then goes through the same review as one the person uploaded themselves.
 *
 * @param {string} userId
 */
export default function AdminUploadDocumentCard({ userId }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState('');
  const [file, setFile] = useState(null);
  const upload = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append('file', file);
      return apiUpload(`/documents/admin/users/${userId}?documentType=${encodeURIComponent(type)}`, formData);
    },
    onSuccess: () => {
      toast.success('Document uploaded — it is now waiting for review.');
      setFile(null);
      setType('');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  return (
    <Card className="p-5 flex flex-col gap-4 lg:col-span-2">
      <h2 className="flex items-center gap-2 font-heading text-brand-white text-base font-semibold">
        <Upload size={17} className="text-brand-gold" aria-hidden="true" />
        Upload a document for this user
      </h2>
      <p className="text-sm text-brand-grey -mt-2">For a copy handed in to staff. It is reviewed like any other upload.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <Select
          label="Document"
          placeholder="Choose the type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={Object.values(DOCUMENT_TYPES).map((t) => ({ value: t, label: DOCUMENT_TYPE_LABELS[t] || t }))}
        />
        <label className="flex flex-col gap-1 text-sm font-medium text-brand-white">
          File
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm text-brand-grey file:mr-3 file:rounded-full file:border file:border-brand-gold file:bg-transparent file:px-4 file:py-1.5 file:text-brand-gold file:font-semibold"
          />
        </label>
      </div>
      {upload.isError && <p role="alert" className="text-sm text-red-400">{apiErrorMessage(upload.error, "Couldn't upload the document.")}</p>}
      <Button className="self-start" disabled={!type || !file} loading={upload.isPending} onClick={() => upload.mutate()}>
        {!upload.isPending && <Upload size={14} aria-hidden="true" />} Upload
      </Button>
    </Card>
  );
}
