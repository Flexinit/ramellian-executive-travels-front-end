import { pdfjs } from 'react-pdf';
import mammoth from 'mammoth';

/** Accepted by the file input in ContractTemplateEditor — kept in sync with the branches below. */
export const TEMPLATE_UPLOAD_ACCEPT = '.txt,.md,.pdf,.docx';

/**
 * Reads a contract template file into plain text the owner/admin can then edit and save as a
 * template's `content` (the backend only stores a string — there is no file storage for templates).
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractTemplateText(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith('.txt') || name.endsWith('.md')) {
    return (await file.text()).trim();
  }

  if (name.endsWith('.pdf')) {
    const data = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str).join(' '));
    }
    return pages.join('\n\n').trim();
  }

  if (name.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return value.trim();
  }

  if (name.endsWith('.doc')) {
    throw new Error("Old .doc files can't be read in the browser — save it as .docx (or PDF) and try again.");
  }

  throw new Error('Unsupported file type. Upload a .txt, .md, .pdf, or .docx file.');
}
