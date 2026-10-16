import React, { useRef, useState } from 'react';
import { Upload, ShieldCheck } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import ContractDocument from '../contract/ContractDocument';
import Spinner from '../ui/Spinner';
import { extractTemplateText, TEMPLATE_UPLOAD_ACCEPT } from '../../lib/extractTemplateText';
import { PLATFORM_LIABILITY_CLAUSE, withPlatformClause, stripPlatformClause } from '../../lib/contractBoilerplate';

/**
 * Plain Markdown source editor — no rich-text/WYSIWYG library is
 * installed, so this is a large monospaced textarea rather than a true
 * rich-text editor. Adding a WYSIWYG (e.g. TipTap) would be a deliberate
 * dependency decision, not made here.
 *
 * A template can also start from an uploaded .txt/.md/.pdf/.docx file: it is read client-side into
 * plain text (the backend only ever stores `content` as a string, there is no file storage for
 * templates) and dropped into the textarea below, where it can be edited like anything typed by hand.
 * A Preview tab shows it the way a renter will eventually see it (docs/design.md, ContractViewer).
 *
 * Every contract starts with a fixed platform clause (see `lib/contractBoilerplate.js`) making clear the
 * agreement is between the owner and renter, not with Ramellian — shown here read-only, above the editable
 * body, and prepended to `content` on save so it reaches the backend as part of the same string the signed
 * contract is built from.
 *
 * @param {{name?: string, content?: string}} [template] — starting values (a new version starts from an existing template)
 * @param {function} onSave — ({ name, content }) => void — `content` already includes the platform clause
 * @param {function} onDiscard
 * @param {boolean} isSaving
 */
export default function ContractTemplateEditor({ template, onSave, onDiscard, isSaving }) {
  const [name, setName] = useState(template?.name || '');
  const [content, setContent] = useState(stripPlatformClause(template?.content || ''));
  const [tab, setTab] = useState('edit'); // 'edit' | 'preview'
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const text = await extractTemplateText(file);
      setContent(text);
      if (!name.trim()) setName(file.name.replace(/\.[^./]+$/, ''));
      setTab('edit');
    } catch (err) {
      setUploadError(err.message || 'Could not read that file.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Input label="Template Name" name="name" value={name} onChange={(e) => setName(e.target.value)} />

      <div className="flex flex-wrap items-center gap-3">
        <input ref={fileInputRef} type="file" accept={TEMPLATE_UPLOAD_ACCEPT} className="hidden" onChange={handleFile} />
        <Button type="button" size="sm" loading={uploading} onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} aria-hidden="true" />
          Upload a file
        </Button>
        <span className="text-brand-grey text-xs">.txt, .md, .pdf, or .docx — read into the text below, which you can then edit.</span>
      </div>
      {uploadError && <p role="alert" className="text-red-400 text-xs">{uploadError}</p>}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-brand-white">Platform Terms</span>
        <div className="flex items-start gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
          <ShieldCheck size={15} className="text-brand-gold shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-brand-grey text-xs leading-relaxed whitespace-pre-wrap">{PLATFORM_LIABILITY_CLAUSE}</p>
        </div>
        <p className="text-brand-grey text-xs">
          Included automatically at the top of every contract you offer — not editable here. Your own terms,
          below, can add to this but can't remove it.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="template-content" className="text-sm font-medium text-brand-white">
            Contract Body (Markdown)
          </label>
          <div className="flex gap-1 rounded-full border border-white/10 p-0.5 text-xs">
            <button
              type="button"
              aria-pressed={tab === 'edit'}
              onClick={() => setTab('edit')}
              className={`px-3 py-1 rounded-full transition ${tab === 'edit' ? 'bg-brand-gold text-brand-dark' : 'text-brand-grey'}`}
            >
              Edit
            </button>
            <button
              type="button"
              aria-pressed={tab === 'preview'}
              onClick={() => setTab('preview')}
              className={`px-3 py-1 rounded-full transition ${tab === 'preview' ? 'bg-brand-gold text-brand-dark' : 'text-brand-grey'}`}
            >
              Preview
            </button>
          </div>
        </div>

        {tab === 'edit' ? (
          <textarea
            id="template-content"
            rows={16}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={'# Rental Agreement\n\nThis agreement is made between...'}
            className="w-full rounded-lg bg-white/5 border border-white/10 hover:border-brand-gold/50 px-3 py-2.5 text-brand-white placeholder-brand-grey text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent transition"
          />
        ) : uploading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" label="Reading file" />
          </div>
        ) : (
          <div className="rounded-lg max-h-[32rem] overflow-y-auto">
            {content.trim() ? (
              // Exactly how renters will see it (blanks show as "Not provided" until a booking fills them).
              <ContractDocument contractText={withPlatformClause(content)} />
            ) : (
              <p className="text-brand-grey text-sm">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" onClick={onDiscard}>
          Discard
        </Button>
        <Button
          type="button"
          loading={isSaving}
          disabled={!name.trim() || !content.trim()}
          onClick={() => onSave({ name: name.trim(), content: withPlatformClause(content) })}
        >
          Save Template
        </Button>
      </div>
    </div>
  );
}
