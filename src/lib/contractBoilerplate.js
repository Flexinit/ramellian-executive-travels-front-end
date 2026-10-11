/**
 * The platform clause every owner's rental contract starts with — the piece that makes clear, inside the
 * document the renter actually signs, that the agreement is between the owner and renter, not with
 * Ramellian. `ContractTemplateEditor` shows it as a fixed block the owner can't edit and prepends it to
 * `content` on save, so it reaches the backend as part of the same string the contract is built from
 * (`ContractTemplateRequest.content` has no separate field for it — confirmed against the live OpenAPI
 * spec, checked 2026-10-05) and ends up in what the renter signs. It needs the same legal review as
 * `TermsPage`/`PrivacyPage` before it's treated as final, binding wording.
 *
 * If this text ever changes, a template saved under the old wording keeps that old wording baked into its
 * stored `content` until the owner next edits and re-saves it — `stripPlatformClause` only recognizes an
 * exact match, so an outdated clause is treated as part of the owner's own text rather than silently
 * dropped or rewritten.
 */
export const PLATFORM_LIABILITY_CLAUSE = `## Ramellian Platform Terms

This rental is arranged between the vehicle owner named in this agreement and the renter signing it. Ramellian Executive Travels operates the booking platform, payment, and verification process, but is not a party to this agreement and is not liable for loss, damage, injury, theft, delay, or any dispute arising from this rental, including the vehicle's condition or either party's conduct during it. The owner and renter are responsible to each other, under this agreement and applicable law, for anything that happens during the rental period.`;

const CLAUSE_SEPARATOR = '\n\n---\n\n';

/** The stored `content` a template is saved with: the fixed clause above, then the owner's own text. */
export function withPlatformClause(ownerContent) {
  return `${PLATFORM_LIABILITY_CLAUSE}${CLAUSE_SEPARATOR}${ownerContent}`;
}

/** The owner's own portion of a saved template's `content`, for editing — strips the fixed clause back off
 * if it's there; an older template saved before this clause existed is returned unchanged. */
export function stripPlatformClause(content = '') {
  const prefix = `${PLATFORM_LIABILITY_CLAUSE}${CLAUSE_SEPARATOR}`;
  return content.startsWith(prefix) ? content.slice(prefix.length) : content;
}
