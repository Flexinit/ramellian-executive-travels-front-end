import React, { useState } from 'react';
import { Plus, FilePlus2 } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import Pagination from '../components/ui/Pagination';
import { usePagination } from '../hooks/usePagination';
import ContractTemplateEditor from '../components/admin/ContractTemplateEditor';
import { useContractTemplates, useCreateTemplate, useReviewTemplate } from '../hooks/useContractTemplates';

const APPROVED = 'APPROVED';
const REJECTED = 'REJECTED';

const statusLabel = (status) => (status ? status.charAt(0) + status.slice(1).toLowerCase() : 'Unknown');
const statusVariant = (status) => (status === APPROVED ? 'success' : status === REJECTED ? 'danger' : 'warning');

function TemplateCard({ template, onNewVersion }) {
  const review = useReviewTemplate();
  const [showing, setShowing] = useState(false);
  const decide = (status) => review.mutate({ id: template.id, status });

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="font-heading text-ink text-lg font-semibold truncate">{template.name}</h2>
          <p className="text-muted text-xs mt-1">Version {template.version ?? 1}</p>
        </div>
        <Badge label={statusLabel(template.status)} variant={statusVariant(template.status)} />
      </div>

      {showing && (
        <pre className="whitespace-pre-wrap break-words rounded-lg bg-ink/5 border border-ink/10 p-3 text-xs text-muted font-mono max-h-80 overflow-y-auto">
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
        <Button
          size="sm"
          aria-label={`Approve ${template.name}`}
          disabled={review.isPending || template.status === APPROVED}
          loading={review.isPending && review.variables?.status === APPROVED}
          onClick={() => decide(APPROVED)}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="danger"
          aria-label={`Reject ${template.name}`}
          disabled={review.isPending || template.status === REJECTED}
          loading={review.isPending && review.variables?.status === REJECTED}
          onClick={() => decide(REJECTED)}
        >
          Reject
        </Button>
      </div>
    </Card>
  );
}

/**
 * Contract templates (`/contract-templates/admin`): every template, whoever wrote it, with its
 * version and review status. An administrator can add one, approve or reject one, or save changes
 * as a new version — the backend has no update or delete for a template.
 */
export default function ContractTemplatesPage() {
  const { data: templates, isLoading, isError, refetch } = useContractTemplates();
  const createTemplate = useCreateTemplate();
  const [editing, setEditing] = useState(null); // null = list view; {} = new; {...} = a new version of an existing one
  const pages = usePagination(Array.isArray(templates) ? templates : [], 10);

  function handleSave(values) {
    createTemplate.mutate(values, { onSuccess: () => setEditing(null) });
  }

  if (editing !== null) {
    return (
      <PageWrapper className="max-w-2xl">
        <div className="flex flex-col gap-6">
          <h1 className="font-heading text-ink text-2xl font-bold">{editing?.id ? 'New Version' : 'New Template'}</h1>
          <ContractTemplateEditor
            template={editing}
            onSave={handleSave}
            onDiscard={() => setEditing(null)}
            isSaving={createTemplate.isPending}
          />
        </div>
      </PageWrapper>
    );
  }

  const list = Array.isArray(templates) ? templates : [];

  return (
    <PageWrapper className="max-w-3xl">
      <PageTitle title="Contract Templates" />
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Contract Templates</h1>
          <Button size="sm" onClick={() => setEditing({})}>
            <Plus size={15} aria-hidden="true" />
            New Template
          </Button>
        </div>

        {isError && <ErrorBanner message="We couldn't load the templates just now." onRetry={refetch} />}

        {isLoading && (
          <div className="flex justify-center py-10">
            <Spinner size="lg" label="Loading templates" />
          </div>
        )}

        {!isLoading && !isError && list.length === 0 && (
          <EmptyState icon={FilePlus2} title="No templates yet" description="Create your first contract template." />
        )}

        {list.length > 0 && (
          <>
            <ul className="flex flex-col gap-3" aria-label="Contract templates">
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
