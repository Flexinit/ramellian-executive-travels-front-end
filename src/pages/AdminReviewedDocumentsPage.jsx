import React, { useState } from 'react';
import { CheckCircle2, Maximize2, Undo2, XCircle } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import Textarea from '../components/ui/Textarea';
import { DocumentPreview, DocumentViewer } from '../components/admin/DocumentPreview';
import VehicleTag from '../components/admin/VehicleTag';
import { REVIEW_STATUSES, useReviewDocument } from '../hooks/useAdminDocuments';
import { useDocuments } from '../hooks/useDocuments';
import { useReviewHistory } from '../lib/documentReviews';
import { DOCUMENT_TYPE_LABELS } from '../lib/constants';
import { formatDateTime, formatFileSize } from '../lib/utils';
import { usePagination } from '../hooks/usePagination';

const PAGE_SIZE = 5; // each card shows the whole document, so pages are short

const PAGES = {
  [REVIEW_STATUSES.APPROVED]: {
    title: 'Approved Documents',
    badge: 'Approved',
    verb: 'approve',
    variant: 'success',
    icon: CheckCircle2,
    intro: 'Documents you have approved. If one shouldn’t have been, you can reject it instead or send it back to pending review.',
    flipTo: REVIEW_STATUSES.REJECTED,
    flipLabel: 'Reject instead',
  },
  [REVIEW_STATUSES.REJECTED]: {
    title: 'Rejected Documents',
    badge: 'Rejected',
    verb: 'reject',
    variant: 'danger',
    icon: XCircle,
    intro: 'Documents you have rejected. If one should have been accepted, you can approve it instead or send it back to pending review.',
    flipTo: REVIEW_STATUSES.APPROVED,
    flipLabel: 'Approve instead',
  },
};

function ReviewedDocumentCard({ entry, page, onOpen }) {
  const review = useReviewDocument();
  const [notes, setNotes] = useState(entry.notes || '');
  const title = DOCUMENT_TYPE_LABELS[entry.documentType] || entry.documentType;
  // The record kept for a decision has what the file needs to be shown again.
  const change = (status) => review.mutate({ id: entry.id, status, notes: status === REVIEW_STATUSES.PENDING ? '' : notes.trim(), document: entry });

  return (
    <Card className="p-5 grid gap-5 md:grid-cols-[minmax(0,20rem)_1fr]">
      <div className="rounded-xl border border-ink/10 bg-subtle overflow-hidden self-start w-full">
        <DocumentPreview document={entry} onOpen={onOpen} />
      </div>

      <div className="flex flex-col gap-4 min-w-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="font-heading text-ink text-lg font-semibold">{title}</h2>
            <p className="text-muted text-xs mt-1 break-all">
              {entry.originalFileName} · {formatFileSize(entry.fileSize)} · uploaded {formatDateTime(entry.createdAt)}
            </p>
            <p className="text-muted text-xs mt-1">
              {entry.decidedAt ? `${page.badge} ${formatDateTime(entry.decidedAt)}` : 'One of your own documents'}
            </p>
          </div>
          <Badge label={page.badge} variant={page.variant} />
        </div>

        {entry.vehicleId && <VehicleTag vehicleId={entry.vehicleId} />}

        <Textarea
          label="Notes for the person (optional)"
          name={`notes-${entry.id}`}
          rows={2}
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          hint="Sent along if you change this decision."
        />

        <div className="flex flex-wrap gap-3">
          <Button size="sm" onClick={() => onOpen(entry)}>
            <Maximize2 size={14} aria-hidden="true" />
            View full size
          </Button>
          <Button
            size="sm"
            variant={page.flipTo === REVIEW_STATUSES.REJECTED ? 'danger' : 'default'}
            aria-label={`${page.flipLabel}: ${title}`}
            disabled={review.isPending}
            loading={review.isPending && review.variables?.status === page.flipTo}
            onClick={() => change(page.flipTo)}
          >
            {page.flipLabel}
          </Button>
          <Button
            size="sm"
            aria-label={`Send ${title} back to pending review`}
            disabled={review.isPending}
            loading={review.isPending && review.variables?.status === REVIEW_STATUSES.PENDING}
            onClick={() => change(REVIEW_STATUSES.PENDING)}
          >
            <Undo2 size={14} aria-hidden="true" />
            Back to pending
          </Button>
        </div>
      </div>
    </Card>
  );
}

/**
 * The Approved / Rejected document pages. The backend can only list documents still waiting for review, so
 * these show two things: the administrator's OWN documents that have been decided (the backend does report the
 * status of a person's own documents, `GET /documents/me`), and the decisions this portal has recorded in this
 * browser (lib/documentReviews.js). Each card shows the document again and lets an administrator reverse the
 * decision: flip it to the other outcome, or send it back to pending review.
 *
 * @param {'APPROVED'|'REJECTED'} status
 */
export default function AdminReviewedDocumentsPage({ status }) {
  const page = PAGES[status];
  const recorded = useReviewHistory(status);
  const own = useDocuments();
  // The reviewer's own documents that have this outcome, unless this browser already has a record of that decision.
  const ownDecided = (Array.isArray(own.data) ? own.data : [])
    .filter((d) => String(d.reviewStatus || '').toUpperCase() === status && !recorded.some((r) => r.id === d.id))
    .map((d) => ({
      id: d.id, documentType: d.documentType, vehicleId: d.vehicleId, originalFileName: d.originalFileName, contentType: d.contentType,
      fileSize: d.fileSize, createdAt: d.createdAt, status, notes: d.reviewNotes || '', decidedAt: null, own: true,
    }));
  const entries = [...recorded, ...ownDecided];
  const [viewing, setViewing] = useState(null);
  const pages = usePagination(entries, PAGE_SIZE, status);

  return (
    <PageWrapper className="max-w-4xl">
      <PageTitle title={page.title} />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">{page.title}</h1>
          <p className="text-muted text-sm mt-1">{page.intro}</p>
          <p className="text-muted text-xs mt-2">
            Your decisions are saved by the backend. But it can only list documents still waiting, not ones already decided, so this page shows
            your own documents that have been decided, plus the decisions made from this browser. Someone else&apos;s document decided
            elsewhere (or before this page existed) isn&apos;t listed here, even though its decision is saved.
          </p>
        </div>

        {entries.length === 0 ? (
          <EmptyState icon={page.icon} title={`No ${page.badge.toLowerCase()} documents yet`} description={`Documents you ${page.verb} will appear here.`} />
        ) : (
          <>
            <ul className="flex flex-col gap-4" aria-label={page.title}>
              {pages.pageItems.map((entry) => (
                <li key={entry.id}>
                  <ReviewedDocumentCard entry={entry} page={page} onOpen={setViewing} />
                </li>
              ))}
            </ul>
            <Pagination page={pages.page} totalPages={pages.totalPages} onPage={pages.setPage} from={pages.from} to={pages.to} total={pages.total} pageSize={pages.pageSize} onPageSize={pages.setPageSize} defaultPageSize={pages.defaultPageSize} noun="documents" />
          </>
        )}
      </div>

      <DocumentViewer document={viewing} onClose={() => setViewing(null)} />
    </PageWrapper>
  );
}
