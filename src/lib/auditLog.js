/** `AUTH_LOGIN` → `Auth login`. */
export function actionLabel(action) {
  return action ? String(action).replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()) : 'Unknown action';
}

/** Badge colour for an entry's `status` (the backend writes `SUCCESS` for a normal outcome). */
export function auditStatusVariant(status) {
  if (!status) return 'neutral';
  return String(status).toUpperCase() === 'SUCCESS' ? 'success' : 'danger';
}
