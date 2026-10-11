/**
 * Numbers for the platform report, worked out from the lists the backend already gives an administrator
 * (`GET /users/admin`, `GET /vehicles`, the audit log). Nothing here calls the backend.
 */

const has = (user, ...roles) => (user.roles || []).some((r) => roles.includes(r));

/**
 * @param {object[]} users `UserResponse[]`
 * @returns {{ total: number, active: number, disabled: number, emailVerified: number, profileCompleted: number,
 *   twoFactor: number, roles: { renters: number, owners: number, managers: number, admins: number } }}
 *   Role counts are accounts *holding* the role, so one account can be in several (a super admin who owns cars is
 *   both). A plain renter has no role at all, so an account with no roles counts as a renter.
 */
export function userStats(users = []) {
  const count = (test) => users.filter(test).length;
  return {
    total: users.length,
    active: count((u) => u.enabled !== false),
    disabled: count((u) => u.enabled === false),
    emailVerified: count((u) => u.emailVerified),
    profileCompleted: count((u) => u.hasCompletedProfile),
    twoFactor: count((u) => u.twoFactorEnabled),
    roles: {
      renters: count((u) => !(u.roles || []).length || has(u, 'CAR_RENTER')),
      owners: count((u) => has(u, 'CAR_OWNER')),
      managers: count((u) => has(u, 'MANAGE')),
      admins: count((u) => has(u, 'ADMIN', 'SUPER_ADMIN')),
    },
  };
}

/**
 * @param {object[]} vehicles `VehicleResponse[]`
 * @returns {{ total: number, available: number, unavailable: number, insured: number, insuredWithSticker: number,
 *   notInsured: number, selfDrive: number, chauffeured: number, averagePerDay: number, locations: Array<{ name: string, count: number }> }}
 */
export function vehicleStats(vehicles = []) {
  const count = (test) => vehicles.filter(test).length;
  const byPlace = new Map();
  vehicles.forEach((v) => {
    const name = (v.location || '').trim() || 'Unknown';
    byPlace.set(name, (byPlace.get(name) || 0) + 1);
  });
  const priced = vehicles.filter((v) => Number(v.pricePerDay) > 0);
  return {
    total: vehicles.length,
    available: count((v) => v.available !== false),
    unavailable: count((v) => v.available === false),
    insured: count((v) => v.comprehensiveInsurance),
    insuredWithSticker: count((v) => v.comprehensiveInsurance && v.insuranceVerificationStickerPhoto),
    notInsured: count((v) => !v.comprehensiveInsurance),
    selfDrive: count((v) => v.selfDrive),
    chauffeured: count((v) => v.chauffeured),
    averagePerDay: priced.length ? priced.reduce((sum, v) => sum + Number(v.pricePerDay), 0) / priced.length : 0,
    locations: [...byPlace.entries()].map(([name, n]) => ({ name, count: n })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}

/** How long a login is good for: the backend's access tokens last one hour (checked on a live token). */
export const SESSION_MINUTES = 60;

/**
 * Who has signed in recently, from the audit log's login entries. The backend has no "who is online" call and
 * records no sign-outs, so this is "signed in within the last hour" — the life of an access token — not a live
 * connection count.
 *
 * @param {object[]} entries `AuditLogResponse[]` (any order)
 * @param {number} [now] — ms since the epoch
 * @param {number} [minutes]
 * @returns {Array<{ email: string, at: string, logins: number }>} one row per person, most recent first
 */
export function recentSignIns(entries = [], now = Date.now(), minutes = SESSION_MINUTES) {
  const since = now - minutes * 60 * 1000;
  const people = new Map();
  entries
    .filter((e) => e.action === 'AUTH_LOGIN' && String(e.status || 'SUCCESS').toUpperCase() === 'SUCCESS' && e.actorEmail && new Date(e.createdAt).getTime() >= since)
    .forEach((e) => {
      const seen = people.get(e.actorEmail);
      if (!seen) people.set(e.actorEmail, { email: e.actorEmail, at: e.createdAt, logins: 1 });
      else {
        seen.logins += 1;
        if (new Date(e.createdAt) > new Date(seen.at)) seen.at = e.createdAt;
      }
    });
  return [...people.values()].sort((a, b) => new Date(b.at) - new Date(a.at));
}
