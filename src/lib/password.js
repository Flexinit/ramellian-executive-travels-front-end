import { z } from 'zod';

/**
 * The rules a new password must meet (product rule 2026-10-16): 8–72 characters (the backend's own limits), with at
 * least one letter, one number and one symbol. Used wherever a password is chosen: registration (page and panel)
 * and changing it (Profile → Security).
 */
export const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'letter', label: 'A letter', test: (p) => /[A-Za-z]/.test(p) },
  { key: 'number', label: 'A number', test: (p) => /\d/.test(p) },
  { key: 'symbol', label: 'A symbol, e.g. ! @ # ? -', test: (p) => /[^A-Za-z0-9\s]/.test(p) },
];
export const PASSWORD_MAX = 72;

/** The first rule `password` doesn't meet, as a message — or null when it meets them all. */
export function passwordProblem(password = '') {
  if (password.length > PASSWORD_MAX) return `At most ${PASSWORD_MAX} characters`;
  const missing = PASSWORD_RULES.filter((r) => !r.test(password));
  if (!missing.length) return null;
  return `Your password needs: ${missing.map((r) => r.label.toLowerCase()).join(', ')}`;
}

/** The form field for a new password. */
export const newPasswordField = z.string().superRefine((value, ctx) => {
  const problem = passwordProblem(value);
  if (problem) ctx.addIssue({ code: 'custom', message: problem });
});
