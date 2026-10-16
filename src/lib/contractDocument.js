/**
 * Reads a contract's text — an owner's template, written in Markdown, with its `{{fields}}` already filled
 * (see `contractFields.js`) — into the parts of a document, so `ContractDocument` can lay it out as a proper
 * agreement instead of showing the Markdown itself. Any template works: this follows its structure rather than
 * expecting a particular one.
 *
 *  - `# Title` → the document's title (the first one; later ones become sections)
 *  - `## Heading` / `### Heading` → a section / sub-section
 *  - a line that is only bold (`**The Owner**`) → a sub-heading
 *  - `---` → the end of a preamble (anything before it that comes ahead of the title is the platform's notice)
 *  - `- Label: value` lists → a details table (label / value rows); other `-` lists → bullets
 *  - `1. …` lists → a numbered list
 *  - lines that are all `**Label:** value` → a details table too (e.g. the reference and date)
 *  - `4.1 Text…` → a numbered clause
 *  - anything else → a paragraph
 *
 * @param {string} text
 * @returns {{ title: string|null, preamble: object[], blocks: object[] }}
 */
export function parseContract(text = '') {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  const all = [];
  let i = 0;

  const isBlank = (l) => !l.trim();
  const isBullet = (l) => /^\s*[-*•]\s+/.test(l);
  const isNumbered = (l) => /^\s*\d+[.)]\s+/.test(l);
  const isHeading = (l) => /^#{1,6}\s+/.test(l);
  const isRule = (l) => /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l);
  const startsBlock = (l) => isBlank(l) || isHeading(l) || isRule(l) || isBullet(l) || isNumbered(l);

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) { i += 1; continue; }

    if (isRule(line)) { all.push({ type: 'rule' }); i += 1; continue; }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      all.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() });
      i += 1;
      continue;
    }

    if (isBullet(line)) {
      const items = [];
      while (i < lines.length && isBullet(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, '').trim());
        i += 1;
      }
      all.push(listBlock(items));
      continue;
    }

    if (isNumbered(line)) {
      const items = [];
      while (i < lines.length && isNumbered(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, '').trim());
        i += 1;
      }
      all.push({ type: 'numbered', items });
      continue;
    }

    // A paragraph: this line and the ones straight after it, up to the next block.
    const para = [line.trim()];
    i += 1;
    while (i < lines.length && !startsBlock(lines[i])) {
      para.push(lines[i].trim());
      i += 1;
    }
    all.push(paragraphBlock(para));
  }

  // The title is the first top-level heading; a rule before it closes the platform's preamble.
  const titleAt = all.findIndex((b) => b.type === 'heading' && b.level === 1);
  const ruleAt = all.findIndex((b) => b.type === 'rule');
  const hasPreamble = ruleAt !== -1 && titleAt !== -1 && ruleAt < titleAt;
  const preamble = hasPreamble ? all.slice(0, ruleAt) : [];
  const rest = hasPreamble ? all.slice(ruleAt + 1) : all;
  const ownTitleAt = rest.findIndex((b) => b.type === 'heading' && b.level === 1);
  const title = ownTitleAt !== -1 ? rest[ownTitleAt].text : null;
  const blocks = rest.filter((_, idx) => idx !== ownTitleAt);

  return { title, preamble, blocks };
}

// `Label: value` (the label optionally bold) — short labels only, so a sentence that happens to contain a
// colon isn't mistaken for one.
const PAIR = /^\*{0,2}([^*:][^:]{0,80}?)\*{0,2}:\*{0,2}\s+(.*)$/;

function listBlock(items) {
  const pairs = items.map((item) => item.match(PAIR));
  if (pairs.every(Boolean)) {
    return { type: 'details', rows: pairs.map((m) => ({ label: m[1].trim(), value: m[2].trim() })) };
  }
  return { type: 'bullets', items };
}

function paragraphBlock(lines) {
  // Every line `**Label:** value` → details (e.g. "**Agreement reference:** …" / "**Date of agreement:** …").
  const pairs = lines.map((l) => l.match(/^\*\*([^*]+?):?\*\*:?\s*(.*)$/));
  if (pairs.every((m) => m && m[2])) {
    return { type: 'details', rows: pairs.map((m) => ({ label: m[1].replace(/:$/, '').trim(), value: m[2].trim() })) };
  }
  const joined = lines.join(' ');
  // A line that is only bold → a sub-heading.
  const strong = joined.match(/^\*\*([^*]+)\*\*$/);
  if (strong) return { type: 'subheading', text: strong[1].trim() };
  // "4.1 Text…" → a numbered clause.
  const clause = joined.match(/^(\d+(?:\.\d+)+)\s+(.*)$/);
  if (clause) return { type: 'clause', number: clause[1], text: clause[2] };
  return { type: 'paragraph', text: joined };
}

/**
 * Splits inline text into plain / bold / italic / blank runs, for rendering: `**bold**`, `*italic*`, and the
 * `__________` blank that `fillContractText` leaves for a detail nobody has filled in.
 * @param {string} text
 * @returns {Array<{ kind: 'text'|'bold'|'italic'|'blank', text: string }>}
 */
export function inlineRuns(text = '') {
  const runs = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|_{4,})/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) runs.push({ kind: 'text', text: text.slice(last, m.index) });
    if (m[2] != null) runs.push({ kind: 'bold', text: m[2] });
    else if (m[3] != null) runs.push({ kind: 'italic', text: m[3] });
    else runs.push({ kind: 'blank', text: '' });
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push({ kind: 'text', text: text.slice(last) });
  return runs;
}

/** Whether a filled-in value is really empty: blank, or only the `__________` blank `fillContractText` leaves. */
export function isBlankValue(value = '') {
  return !String(value).replace(/_{4,}/g, '').replace(/[\s—–-]/g, '').trim();
}

/**
 * Splits a contract's blocks into short parts to read one at a time: at each section heading, packed so each part
 * is about a screen long (a details table counts its filled rows, everything else a couple of lines). Text before
 * the first heading joins the first part. Each part is titled by the sections it holds.
 * @param {object[]} blocks — `parseContract(...).blocks`
 * @param {number} [budget] — roughly how much fits in one part
 * @returns {Array<{ title: string, blocks: object[] }>}
 */
export function contractStages(blocks = [], budget = 26) {
  const sections = [];
  let current = { title: null, blocks: [] };
  for (const block of blocks) {
    if (block.type === 'heading' && block.level <= 2) {
      if (current.blocks.length) sections.push(current);
      current = { title: block.text.replace(/\*\*/g, ''), blocks: [block] };
    } else {
      current.blocks.push(block);
    }
  }
  if (current.blocks.length) sections.push(current);
  // An untitled opening (text before the first heading) belongs with the first section, not a part of its own.
  if (sections.length > 1 && sections[0].title == null) {
    const [opening, next, ...others] = sections;
    sections.splice(0, sections.length, { title: next.title, blocks: [...opening.blocks, ...next.blocks] }, ...others);
  }

  const weight = (b) => (b.type === 'details' ? b.rows.filter((r) => !isBlankValue(r.value)).length || 1 : b.type === 'bullets' || b.type === 'numbered' ? b.items.length : 2);
  const sectionWeight = (s) => s.blocks.reduce((sum, b) => sum + weight(b), 0);

  const stages = [];
  let stage = null;
  for (const section of sections) {
    const w = sectionWeight(section);
    if (stage && stage.weight + w > budget) {
      stages.push(stage);
      stage = null;
    }
    if (!stage) stage = { titles: [], blocks: [], weight: 0 };
    if (section.title) stage.titles.push(section.title);
    stage.blocks.push(...section.blocks);
    stage.weight += w;
  }
  if (stage) stages.push(stage);

  return stages.map((s) => ({ title: s.titles.length ? stageTitle(s.titles) : 'Introduction', blocks: s.blocks }));
}

// "1. The Parties" → "The Parties"; several → "The Parties & The Vehicle" (or the first and last of a run).
function stageTitle(titles) {
  const clean = titles.map((t) => t.replace(/^\d+[.)]?\s*/, ''));
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} & ${clean[1]}`;
  return `${clean[0]} … ${clean[clean.length - 1]}`;
}

/**
 * Takes the unfilled blanks (`__________`) out of a line — with the little phrase that introduced them, e.g.
 * "13 Oct, 09:00 at __________" → "13 Oct, 09:00", "Felix — ID/passport no. __________" → "Felix" — so the contract
 * only shows information that's actually there.
 * @param {string} text
 */
export function withoutBlanks(text = '') {
  return String(text)
    .replace(/\s*(?:[—–-]\s*)?(?:[A-Za-z/][A-Za-z/ ]{0,30}\s(?:no\.?|number))\s*_{4,}/gi, '')
    .replace(/\s*\b(?:at|on|in|by|to)\s+_{4,}/gi, '')
    .replace(/\s*_{4,}/g, '')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/([:—–-])\s*$/g, '')
    .trim();
}

/**
 * The blocks with everything unknown left out: blanks taken out of the text, table rows / list items / clauses
 * that had nothing but blanks dropped, and a heading or sub-heading dropped when nothing is left under it.
 * @param {object[]} blocks
 */
export function onlyAvailable(blocks = []) {
  const cleaned = blocks
    .map((b) => {
      if (b.type === 'details') {
        const rows = b.rows.map((r) => ({ ...r, value: withoutBlanks(r.value) })).filter((r) => r.value);
        return rows.length ? { ...b, rows } : null;
      }
      if (b.type === 'bullets' || b.type === 'numbered') {
        const items = b.items.map(withoutBlanks).filter(Boolean);
        return items.length ? { ...b, items } : null;
      }
      if (b.type === 'clause' || b.type === 'paragraph') {
        const text = withoutBlanks(b.text);
        return text ? { ...b, text } : null;
      }
      return b;
    })
    .filter(Boolean);
  // A sub-heading needs something under it before the next heading of any kind; a section heading needs
  // something before the next section heading.
  return cleaned.filter((b, i) => {
    if (b.type !== 'subheading' && b.type !== 'heading') return true;
    const next = cleaned.slice(i + 1).find(() => true);
    if (!next) return false;
    if (b.type === 'subheading') return next.type !== 'subheading' && next.type !== 'heading';
    if (b.level > 2) return !(next.type === 'heading');
    return !(next.type === 'heading' && next.level <= 2);
  });
}
