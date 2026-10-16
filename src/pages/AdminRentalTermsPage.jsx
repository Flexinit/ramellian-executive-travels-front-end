import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Save } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import ToggleChip from '../components/ui/ToggleChip';
import {
  useAllRentalTerms,
  useCreateRentalTerm,
  useUpdateRentalTerm,
  useToggleRentalTerm,
  useDeleteRentalTerm,
  groupRentalTerms,
} from '../hooks/useRentalTerms';
import { apiErrorMessage } from '../lib/apiError';

const EMPTY = { title: '', content: '', category: '', displayOrder: '' };

/** Add or edit one term (`RentalTermRequest`: title and content required; category and order optional). */
function TermForm({ term, onDone }) {
  const [values, setValues] = useState(
    term ? { title: term.title || '', content: term.content || '', category: term.category || '', displayOrder: term.displayOrder ?? '' } : EMPTY
  );
  const [errors, setErrors] = useState({});
  const create = useCreateRentalTerm();
  const update = useUpdateRentalTerm();
  const saving = create.isPending || update.isPending;
  const set = (f) => (e) => setValues((v) => ({ ...v, [f]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    const problems = {};
    if (!values.title.trim()) problems.title = 'Enter a title';
    if (!values.content.trim()) problems.content = 'Enter the term itself';
    const order = String(values.displayOrder).trim();
    if (order && !Number.isInteger(Number(order))) problems.displayOrder = 'Enter a whole number';
    setErrors(problems);
    if (Object.keys(problems).length) return;
    const request = {
      title: values.title.trim(),
      content: values.content.trim(),
      ...(values.category.trim() ? { category: values.category.trim() } : {}),
      ...(order ? { displayOrder: Number(order) } : {}),
    };
    const done = { onSuccess: onDone };
    if (term) update.mutate({ id: term.id, ...request }, done);
    else create.mutate(request, done);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Input label="Title" value={values.title} onChange={set('title')} error={errors.title} placeholder="e.g. Minimum age" />
      <Textarea label="Term" name="content" rows={5} value={values.content} onChange={set('content')} error={errors.content} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Category (optional)" value={values.category} onChange={set('category')} placeholder="e.g. Drivers, Payment, Vehicle use" hint="Terms are grouped by this." />
        <Input label="Order (optional)" type="number" step="1" value={values.displayOrder} onChange={set('displayOrder')} error={errors.displayOrder} hint="Lower numbers come first." />
      </div>
      {(create.isError || update.isError) && (
        <p role="alert" className="text-sm text-red-400">{apiErrorMessage(create.error || update.error, "Couldn't save the rental term.")}</p>
      )}
      <div className="flex gap-3 justify-end">
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={saving}>{!saving && <Save size={15} aria-hidden="true" />} Save</Button>
      </div>
    </form>
  );
}

/**
 * Administrators manage the platform's rental terms (`rental-term-controller`): add, edit, delete, switch on or
 * off, grouped by category and in order. Renters see the enabled ones on the Terms page and at checkout.
 */
export default function AdminRentalTermsPage() {
  const { data: terms = [], isLoading, isError, error, refetch } = useAllRentalTerms();
  const toggle = useToggleRentalTerm();
  const remove = useDeleteRentalTerm();
  const [editing, setEditing] = useState(null); // null | 'new' | term
  const [deleting, setDeleting] = useState(null);

  return (
    <PageWrapper className="max-w-4xl">
      <PageTitle title="Rental Terms" />
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-brand-white text-2xl sm:text-3xl font-bold">Rental Terms</h1>
            <p className="text-brand-grey text-sm mt-1.5">The rules every rental follows. Renters see the ones switched on, on the Terms page and at checkout.</p>
          </div>
          <Button onClick={() => setEditing('new')}><Plus size={15} aria-hidden="true" /> Add a term</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" label="Loading the rental terms" /></div>
        ) : isError ? (
          <ErrorBanner message={apiErrorMessage(error, 'Could not load the rental terms.')} onRetry={refetch} />
        ) : terms.length === 0 ? (
          <EmptyState title="No rental terms yet" description="Add the first one — e.g. the minimum driver age, or what happens if the car is returned late." action={{ label: 'Add a term', onClick: () => setEditing('new') }} />
        ) : (
          groupRentalTerms(terms).map(({ category, terms: list }) => (
            <section key={category} className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-gold">{category}</h2>
              {list.map((t) => (
                <Card key={t.id} className="p-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-brand-white font-semibold">{t.title}</h3>
                      <p className="text-xs text-brand-grey mt-0.5">Order {t.displayOrder ?? '—'}</p>
                    </div>
                    <Badge label={t.enabled ? 'Shown to renters' : 'Hidden'} variant={t.enabled ? 'success' : 'neutral'} />
                  </div>
                  <p className="text-sm text-brand-grey leading-relaxed whitespace-pre-line">{t.content}</p>
                  <div className="flex flex-wrap gap-2">
                    <ToggleChip active={!!t.enabled} disabled={toggle.isPending} onClick={() => toggle.mutate(t.id)}>
                      {t.enabled ? 'Switched on' : 'Switched off'}
                    </ToggleChip>
                    <Button size="sm" onClick={() => setEditing(t)}><Pencil size={13} aria-hidden="true" /> Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleting(t)}><Trash2 size={13} aria-hidden="true" /> Delete</Button>
                  </div>
                </Card>
              ))}
            </section>
          ))
        )}
      </div>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add a rental term' : 'Edit rental term'}>
        {editing && <TermForm term={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Modal>

      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Delete rental term">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-brand-grey">Delete “{deleting?.title}”? Renters won't see it any more. To hide it for now instead, switch it off.</p>
          <div className="flex gap-3 justify-end">
            <Button onClick={() => setDeleting(null)}>Keep it</Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
