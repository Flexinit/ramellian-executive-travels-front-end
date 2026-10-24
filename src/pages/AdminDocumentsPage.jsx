import React, { useState } from 'react';
import { FileCheck2, Maximize2 } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import Pagination from '../components/ui/Pagination';
import Skeleton from '../components/ui/Skeleton';
import Textarea from '../components/ui/Textarea';
import { DocumentPreview, DocumentViewer } from '../components/admin/DocumentPreview';
import VehicleTag from '../components/admin/VehicleTag';
import { REVIEW_STATUSES, usePendingDocuments, useReviewDocument } from '../hooks/useAdminDocuments';
import { DOCUMENT_TYPE_LABELS } from '../lib/constants';
import { formatDateTime, formatFileSize } from '../lib/utils';
import { usePagination } from '../hooks/usePagination';

const PAGE_SIZE = 5; // each card shows the whole document, so pages are short

function PendingDocumentCard({ document, onOpen }) {
  const review = useReviewDocument();
  const [notes, setNotes] = useState('');
  const title = DOCUMENT_TYPE_LABELS[document.documentType] || document.documentType;
  const decide = (status) => review.mutate({ id: document.id, status, notes: notes.trim(), document });

  return (
    <Card className="p-5 grid gap-5 md:grid-cols-[minmax(0,20rem)_1fr]">
      <div className="rounded-xl border border-ink/10 bg-subtle overflow-hidden self-start w-full">
        <DocumentPreview document={document} onOpen={onOpen} />
      </div>

      <div className="flex flex-col gap-4 min-w-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="font-heading text-ink text-lg font-semibold">{title}</h2>
            <p className="text-muted text-xs mt-1 break-all">
              {document.originalFileName} · {formatFileSize(document.fileSize)} · uploaded {formatDateTime(document.createdAt)}
              {document.vehicleId ? ' · for a vehicle' : ''}
            </p>
          </div>
          <Badge label="Pending review" variant="warning" />
        </div>

        {document.vehicleId && <VehicleTag vehicleId={document.vehicleId} />}

        <Textarea
          label="Notes for the person (optional)"
          name={`notes-${document.id}`}
          rows={2}
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex flex-wrap gap-3">
          <Button size="sm" onClick={() => onOpen(document)}>
            <Maximize2 size={14} aria-hidden="true" />
            View full size
          </Button>
          <Button
            size="sm"
            loading={review.isPending && review.variables?.status === REVIEW_STATUSES.APPROVED}
            disabled={review.isPending}
            aria-label={`Approve ${title}`}
            onClick={() => decide(REVIEW_STATUSES.APPROVED)}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={review.isPending && review.variables?.status === REVIEW_STATUSES.REJECTED}
            disabled={review.isPending}
            aria-label={`Reject ${title}`}
            onClick={() => decide(REVIEW_STATUSES.REJECTED)}
          >
            Reject
          </Button>
        </div>
      </div>
    </Card>
  );
}

/**
 * Document review (`GET /documents/admin/pending`, `PUT /documents/admin/{id}/review`): every uploaded
 * document waiting for a decision, each with the document itself shown on its card. `DocumentResponse` has
 * no field saying whose document it is (no `userId`/`ownerId` at all — confirmed against the live spec,
 * `docs/backend-requests.md` item 11), so a card can only describe the file; there is no reliable way to
 * confirm it belongs to a particular account until the backend adds that field. Decided documents move to
 * the Approved / Rejected pages, where a decision can be reversed.
 */
export default function AdminDocumentsPage() {
  const { data: documents, isLoading, isError, refetch } = usePendingDocuments();
  const [viewing, setViewing] = useState(null);
  const list = Array.isArray(documents) ? documents : [];
  const pages = usePagination(list, PAGE_SIZE);

  return (
    <PageWrapper className="max-w-4xl">
      <PageTitle title="Document Review" />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Document Review</h1>
          <p className="text-muted text-sm mt-1">
            Documents people have uploaded that are waiting for a decision — check each one, then approve or reject it.
            Changed your mind? Decided documents are under <strong className="text-ink font-medium">Approved Documents</strong> and{' '}
            <strong className="text-ink font-medium">Rejected Documents</strong> in the menu.
          </p>
        </div>

        {isError && <ErrorBanner message="We couldn't load the documents just now." onRetry={refetch} />}

        {isLoading ? (
          <div className="flex flex-col gap-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-56 w-full" />
            ))}
          </div>
        ) : list.length === 0 ? (
          !isError && <EmptyState icon={FileCheck2} title="Nothing to review" description="Every uploaded document has been reviewed." />
        ) : (
          <>
            <ul className="flex flex-col gap-4" aria-label="Documents waiting for review">
              {pages.pageItems.map((doc) => (
                <li key={doc.id}>
                  <PendingDocumentCard document={doc} onOpen={setViewing} />
                </li>
              ))}
            </ul>
            <Pagination page={pages.page} totalPages={pages.totalPages} onPage={pages.setPage} from={pages.from} to={pages.to} total={pages.total} noun="documents" />
          </>
        )}
      </div>

      <DocumentViewer document={viewing} onClose={() => setViewing(null)} />
    </PageWrapper>
  );
}
