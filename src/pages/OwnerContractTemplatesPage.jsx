import React, { useState } from 'react';
import { FilePlus2, Plus } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import Spinner from '../components/ui/Spinner';
import Pagination from '../components/ui/Pagination';
import { usePagination } from '../hooks/usePagination';
import ContractTemplateEditor from '../components/admin/ContractTemplateEditor';
import { useCreateOwnerTemplate, useMyContractTemplates } from '../hooks/useContractTemplates';

const statusLabel = (status) => (status ? status.charAt(0) + status.slice(1).toLowerCase() : 'Unknown');
const statusVariant = (status) => (status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'danger' : 'warning');

function TemplateCard({ template, onNewVersion }) {
  const [showing, setShowing] = useState(false);
  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="font-heading text-brand-white text-lg font-semibold truncate">{template.name}</h2>
          <p className="text-brand-grey text-xs mt-1">Version {template.version ?? 1}</p>
        </div>
        <Badge label={statusLabel(template.status)} variant={statusVariant(template.status)} />
      </div>
      {showing && (
        <pre className="whitespace-pre-wrap break-words rounded-lg bg-white/5 border border-white/10 p-3 text-xs text-brand-grey font-mono max-h-80 overflow-y-auto">
          {template.content}
        </pre>
      )}
      <div className="flex flex-wrap gap-3">
        <Button size="sm" aria-expanded={showing} onClick={() => setShowing((v) => !v)}>
          {showing ? 'Hide text' : 'Read text'}
        </Button>
        <Button size="sm" onClick={() => onNewVersion(template)}>
          Save a new version
        </Button>
      </div>
    </Card>
  );
}

/**
 * A car owner's own contract templates (`GET /contract-templates/mine`, `POST /contract-templates/owner`): the
 * wording they'd like used for bookings of their vehicles. Each one waits for an administrator's approval, and the
 * backend has no edit or delete, so a change is saved as a new version.
 */
export default function OwnerContractTemplatesPage() {
  const { data: templates, isLoading, isError, refetch } = useMyContractTemplates();
  const create = useCreateOwnerTemplate();
  const [editing, setEditing] = useState(null); // null = the list; {} = a new one; {...} = a new version of an existing one
  const pages = usePagination(Array.isArray(templates) ? templates : [], 10);

  if (editing !== null) {
    return (
      <PageWrapper className="max-w-2xl">
        <div className="flex flex-col gap-6">
          <h1 className="font-heading text-brand-white text-2xl font-bold">{editing?.id ? 'New Version' : 'New Template'}</h1>
          <ContractTemplateEditor template={editing} onSave={(values) => create.mutate(values, { onSuccess: () => setEditing(null) })} onDiscard={() => setEditing(null)} isSaving={create.isPending} />
        </div>
      </PageWrapper>
    );
  }

  const list = Array.isArray(templates) ? templates : [];

  return (
    <PageWrapper className="max-w-3xl">
      <PageTitle title="My Contract Templates" />
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-brand-white text-2xl sm:text-3xl font-bold">My Contract Templates</h1>
            <p className="text-brand-grey text-sm mt-1">Your own contract wording. Each template is reviewed by an administrator before it can be used.</p>
          </div>
          <Button size="sm" onClick={() => setEditing({})}>
            <Plus size={15} aria-hidden="true" />
            New Template
          </Button>
        </div>

        {isError && <ErrorBanner message="We couldn't load your templates just now." onRetry={refetch} />}
        {isLoading && (
          <div className="flex justify-center py-10">
            <Spinner size="lg" label="Loading templates" />
          </div>
        )}
        {!isLoading && !isError && list.length === 0 && <EmptyState icon={FilePlus2} title="No templates yet" description="Add your own contract wording and send it for review." />}
        {list.length > 0 && (
          <>
            <ul className="flex flex-col gap-3" aria-label="My contract templates">
              {pages.pageItems.map((t) => (
                <li key={t.id}>
                  <TemplateCard template={t} onNewVersion={setEditing} />
                </li>
              ))}
            </ul>
            <Pagination page={pages.page} totalPages={pages.totalPages} onPage={pages.setPage} from={pages.from} to={pages.to} total={pages.total} noun="templates" />
          </>
        )}
      </div>
    </PageWrapper>
  );
}
