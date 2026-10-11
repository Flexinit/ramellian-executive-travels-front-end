import { stripPhoneNumbers } from './contactGuard';

/** Who an announcement can go to. `roles` are the backend's role names; a plain renter has no role at all. */
export const AUDIENCES = Object.freeze([
  { value: 'ALL', label: 'Everyone' },
  { value: 'CAR_RENTER', label: 'Renters' },
  { value: 'CAR_OWNER', label: 'Car owners' },
  { value: 'MANAGE', label: 'Fleet managers' },
  { value: 'ADMIN', label: 'Administrators' },
]);

/** The longest announcement (the same limit renters' notes have). */
export const ANNOUNCEMENT_MAX_LENGTH = 1000;

const holds = (user, ...roles) => (user.roles || []).some((r) => roles.includes(r));

/**
 * The accounts an announcement to `audience` goes to: everyone in it who is switched on, except the sender
 * (the backend doesn't let you message yourself).
 *
 * @param {object[]} users `UserResponse[]`
 * @param {string} audience one of AUDIENCES
 * @param {string} [senderId]
 */
export function recipientsFor(users = [], audience = 'ALL', senderId) {
  return users.filter((user) => {
    if (!user?.id || user.id === senderId || user.enabled === false) return false;
    switch (audience) {
      case 'CAR_RENTER':
        return !(user.roles || []).length || holds(user, 'CAR_RENTER');
      case 'CAR_OWNER':
        return holds(user, 'CAR_OWNER');
      case 'MANAGE':
        return holds(user, 'MANAGE');
      case 'ADMIN':
        return holds(user, 'ADMIN', 'SUPER_ADMIN');
      default:
        return true;
    }
  });
}

/**
 * What is actually sent: trimmed, with phone numbers removed like every other message in the portal.
 * @returns {{ text: string, removedPhone: boolean }}
 */
export function cleanAnnouncement(text) {
  const cleaned = stripPhoneNumbers(text);
  return { text: cleaned.text.trim(), removedPhone: !!cleaned.removed };
}

/** Subject an email announcement starts with; the administrator can change it. */
export const DEFAULT_EMAIL_SUBJECT = 'Announcement from Ramellian Executive Travels';

/** Email links longer than this are refused by some email apps and browsers, so each link is kept under it. */
export const MAILTO_MAX_LENGTH = 1800;

/** The email addresses of some accounts, each once, in order. */
export function emailAddresses(users = []) {
  return [...new Set(users.map((u) => (u?.email || '').trim()).filter(Boolean))];
}

/**
 * `mailto:` links that open the administrator's own email app with the announcement written and everyone in Bcc
 * (so nobody sees anyone else's address). The backend can't send email, and an email link can only be so long, so
 * the recipients are split into as many links as it takes.
 *
 * @param {{ addresses: string[], subject: string, body: string, maxLength?: number }} options
 * @returns {{ links: Array<{ href: string, count: number }>, tooLong: boolean }} `tooLong` when the subject and message alone
 *   don't leave room for even one address — the message can't go in a link, and should be pasted instead.
 */
export function buildMailtoLinks({ addresses = [], subject = '', body = '', maxLength = MAILTO_MAX_LENGTH }) {
  const tail = `&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const address = (a) => encodeURIComponent(a).replace(/%40/g, '@');
  const base = 'mailto:?bcc='.length + tail.length;
  const links = [];
  let current = [];
  let length = base;

  for (const a of addresses.map(address)) {
    const add = a.length + (current.length ? 1 : 0);
    if (current.length && length + add > maxLength) {
      links.push(current);
      current = [];
      length = base;
    }
    current.push(a);
    length += a.length + (current.length > 1 ? 1 : 0);
  }
  if (current.length) links.push(current);

  const tooLong = addresses.length > 0 && base + address(addresses[0]).length > maxLength;
  return {
    tooLong,
    links: tooLong ? [] : links.map((group) => ({ href: `mailto:?bcc=${group.join(',')}${tail}`, count: group.length })),
  };
}
