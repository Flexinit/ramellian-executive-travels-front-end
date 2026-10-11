import { describe, it, expect } from 'vitest';
import { recentSignIns, userStats, vehicleStats } from './platformStats';
import { describeQrPayload, qrMentionsRegistration } from './qrScan';

describe('userStats', () => {
  const users = [
    { id: '1', enabled: true, roles: ['SUPER_ADMIN', 'CAR_OWNER'], emailVerified: true, twoFactorEnabled: true, hasCompletedProfile: true },
    { id: '2', enabled: true, roles: [], emailVerified: true },
    { id: '3', enabled: false, roles: ['CAR_OWNER'] },
    { id: '4', enabled: true, roles: ['MANAGE'] },
    { id: '5', enabled: true, roles: ['ADMIN'] },
  ];

  it('counts accounts, their state and the extras', () => {
    expect(userStats(users)).toMatchObject({ total: 5, active: 4, disabled: 1, emailVerified: 2, profileCompleted: 1, twoFactor: 1 });
  });

  it('counts an account under every role it holds, and an account with no role as a renter', () => {
    expect(userStats(users).roles).toEqual({ renters: 1, owners: 2, managers: 1, admins: 2 });
  });

  it('copes with nothing', () => {
    expect(userStats().total).toBe(0);
  });
});

describe('vehicleStats', () => {
  const vehicles = [
    { location: 'Nairobi', pricePerDay: 10000, available: true, comprehensiveInsurance: true, insuranceVerificationStickerPhoto: '/x.png', selfDrive: true },
    { location: 'Nairobi', pricePerDay: 20000, available: false, comprehensiveInsurance: true, chauffeured: true },
    { location: 'Mombasa', pricePerDay: 0, available: true, comprehensiveInsurance: false },
    { location: '', available: true },
  ];

  it('counts availability, insurance and kind', () => {
    expect(vehicleStats(vehicles)).toMatchObject({
      total: 4, available: 3, unavailable: 1, insured: 2, insuredWithSticker: 1, notInsured: 2, selfDrive: 1, chauffeured: 1,
    });
  });

  it('averages only the vehicles that have a price', () => {
    expect(vehicleStats(vehicles).averagePerDay).toBe(15000);
    expect(vehicleStats([]).averagePerDay).toBe(0);
  });

  it('lists places by how many vehicles are in each, most first, with a blank place as Unknown', () => {
    expect(vehicleStats(vehicles).locations).toEqual([
      { name: 'Nairobi', count: 2 },
      { name: 'Mombasa', count: 1 },
      { name: 'Unknown', count: 1 },
    ]);
  });
});

describe('recentSignIns', () => {
  const now = new Date('2026-09-24T12:00:00Z').getTime();
  const login = (email, time, extra = {}) => ({ action: 'AUTH_LOGIN', status: 'SUCCESS', actorEmail: email, createdAt: time, ...extra });

  it('lists each person once, most recent first, counting their sign-ins', () => {
    const entries = [
      login('a@x.com', '2026-09-24T11:30:00Z'),
      login('b@x.com', '2026-09-24T11:50:00Z'),
      login('a@x.com', '2026-09-24T11:45:00Z'),
    ];
    expect(recentSignIns(entries, now)).toEqual([
      { email: 'b@x.com', at: '2026-09-24T11:50:00Z', logins: 1 },
      { email: 'a@x.com', at: '2026-09-24T11:45:00Z', logins: 2 },
    ]);
  });

  it('leaves out old sign-ins, failed ones, other actions and entries with no person', () => {
    const entries = [
      login('old@x.com', '2026-09-24T10:30:00Z'),
      login('bad@x.com', '2026-09-24T11:55:00Z', { status: 'FAILURE' }),
      login('other@x.com', '2026-09-24T11:55:00Z', { action: 'VEHICLE_CREATE' }),
      login(null, '2026-09-24T11:55:00Z'),
    ];
    expect(recentSignIns(entries, now)).toEqual([]);
  });

  it('can look further back', () => {
    expect(recentSignIns([login('old@x.com', '2026-09-24T10:30:00Z')], now, 24 * 60)).toHaveLength(1);
  });
});

describe('QR payloads', () => {
  it('recognises a web address, and only http(s)', () => {
    expect(describeQrPayload('https://dmvic.com/verify?c=123')).toMatchObject({ kind: 'url', url: 'https://dmvic.com/verify?c=123' });
    expect(describeQrPayload('javascript:alert(1)').kind).toBe('text');
    expect(describeQrPayload('CERT-0012345').kind).toBe('text');
  });

  it('finds the registration in the QR text, ignoring spaces and punctuation', () => {
    expect(qrMentionsRegistration('cert=1;reg=KDA123A;exp=2027', 'KDA 123A')).toBe(true);
    expect(qrMentionsRegistration('CERT-0012345', 'KDA 123A')).toBe(false);
    expect(qrMentionsRegistration('anything', '')).toBe(false);
  });
});
