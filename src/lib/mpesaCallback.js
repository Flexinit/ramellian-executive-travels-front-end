import { formatCurrency, formatDateTime } from './utils';

/**
 * Reads a payment transaction's M-Pesa fields (`PaymentTransactionResponse.mpesa…`, live spec 2026-11-04) and its
 * provider's raw callback (`rawCallback`) into labelled fields, so an administrator sees every M-Pesa field (the M-Pesa
 * ref first) without reading JSON.
 *
 *  - STK push (a renter paying): `Body.stkCallback` — MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc and
 *    `CallbackMetadata.Item[]` ({ Name, Value }: Amount, MpesaReceiptNumber, Balance, TransactionDate, PhoneNumber)
 *  - B2C (a payout to an owner): `Result` — ResultType, ResultCode, ResultDesc, OriginatorConversationID, ConversationID,
 *    TransactionID, `ResultParameters.ResultParameter[]` and `ReferenceData.ReferenceItem` ({ Key, Value })
 *  - anything else (Pesapal, a shape Safaricom adds later): every value in it, by its own name
 *
 * Safaricom sends a single parameter as an object rather than a one-item list; both are read.
 */

const LABELS = {
  MpesaReceiptNumber: 'M-Pesa ref',
  TransactionReceipt: 'M-Pesa ref',
  TransactionID: 'Transaction ID',
  Amount: 'Amount',
  TransactionAmount: 'Amount',
  PhoneNumber: 'Phone',
  TransactionDate: 'Paid at',
  TransactionCompletedDateTime: 'Completed at',
  ReceiverPartyPublicName: 'Paid to',
  Balance: 'Balance',
  MerchantRequestID: 'Merchant request ID',
  CheckoutRequestID: 'Checkout request ID',
  ResultType: 'Result type',
  ResultCode: 'Result code',
  ResultDesc: 'Result',
  OriginatorConversationID: 'Originator conversation ID',
  ConversationID: 'Conversation ID',
  B2CRecipientIsRegisteredCustomer: 'Registered M-Pesa customer',
  B2CUtilityAccountAvailableFunds: 'Utility account balance',
  B2CWorkingAccountAvailableFunds: 'Working account balance',
  B2CChargesPaidAccountAvailableFunds: 'Charges account balance',
  QueueTimeoutURL: 'Queue timeout URL',
};

const MONEY = new Set(['Amount', 'TransactionAmount', 'Balance', 'B2CUtilityAccountAvailableFunds', 'B2CWorkingAccountAvailableFunds', 'B2CChargesPaidAccountAvailableFunds']);
const REF_KEYS = ['MpesaReceiptNumber', 'TransactionReceipt', 'TransactionID'];

/**
 * The M-Pesa fields the ledger sends on each transaction itself, under M-Pesa's own names so they're labelled and
 * ordered like the callback's.
 */
const SERVER_FIELDS = [
  ['mpesaReceiptNumber', 'MpesaReceiptNumber'],
  ['mpesaTransactionDate', 'TransactionDate'],
  ['mpesaPhoneNumber', 'PhoneNumber'],
  ['mpesaBalance', 'Balance'],
  ['mpesaMerchantRequestId', 'MerchantRequestID'],
  ['mpesaCheckoutRequestId', 'CheckoutRequestID'],
  ['mpesaResultCode', 'ResultCode'],
  ['mpesaResultDesc', 'ResultDesc'],
];

/** `OriginatorConversationID` → `Originator conversation ID` for a name not in LABELS. */
const humanize = (key) =>
  String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\bid\b/gi, 'ID')
    .replace(/\burl\b/gi, 'URL');

/**
 * An M-Pesa date as a readable one ("04 Nov 2026, 12:30 PM"); anything it can't read, as sent. M-Pesa's times are
 * Kenya time (EAT, +03:00) unless they say otherwise. Read:
 *  - `20261104123045` — YYYYMMDDHHmmss, the STK `TransactionDate`, as text or a number (also `2.0261104123045E13`)
 *  - `04.11.2026 12:30:45` — DD.MM.YYYY, a B2C `TransactionCompletedDateTime`
 *  - `2026-11-04T12:30:45`, `2026-11-04 12:30:45`, with or without a zone — an ISO date-time from the backend
 */
function mpesaDate(value) {
  const raw = String(value).trim();
  const kenya = (y, mo, d, h = '00', mi = '00', s = '00') => `${y}-${mo}-${d}T${h}:${mi}:${s}+03:00`;
  let iso = null;
  // A number Java wrote as a double comes back in exponent form; it's still the 14 digits.
  const digits = /^\d+(\.\d+)?E\d+$/i.test(raw) ? Number(raw).toFixed(0) : raw;
  let m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(digits);
  if (m) iso = kenya(...m.slice(1));
  else if ((m = /^(\d{2})\.(\d{2})\.(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(raw))) iso = kenya(m[3], m[2], m[1], m[4], m[5], m[6]);
  else if ((m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/.exec(raw))) {
    iso = m[8] ? raw.replace(' ', 'T') : kenya(m[1], m[2], m[3], m[4], m[5], m[6]);
  }
  const date = iso && new Date(iso);
  return date && !Number.isNaN(date.getTime()) ? formatDateTime(date) : raw;
}

const DATES = new Set(['TransactionDate', 'TransactionCompletedDateTime']);

function display(key, value) {
  if (value == null || value === '') return null;
  if (MONEY.has(key) && !Number.isNaN(Number(value))) return formatCurrency(Number(value));
  if (DATES.has(key)) return mpesaDate(value);
  if (value === 'Y' || value === 'N') return value === 'Y' ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const list = (x) => (Array.isArray(x) ? x : x ? [x] : []);

/** Every scalar value in `obj`, by its own key (nested objects and lists walked into). */
function flatten(obj, out = []) {
  if (Array.isArray(obj)) obj.forEach((v) => flatten(v, out));
  else if (obj && typeof obj === 'object') {
    // A { Name|Key, Value } pair is one field, not two.
    const name = obj.Name ?? obj.Key;
    if (name != null && 'Value' in obj && Object.keys(obj).length <= 2) out.push([name, obj.Value]);
    else Object.entries(obj).forEach(([k, v]) => (v && typeof v === 'object' ? flatten(v, out) : out.push([k, v])));
  }
  return out;
}

/** The callback's fields as [M-Pesa name, value] pairs, in the order M-Pesa sent them — `null` when there's none or it isn't JSON. */
function readCallback(raw) {
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== 'object') return null;

  const stk = data.Body?.stkCallback ?? data.stkCallback;
  const b2c = data.Result;
  if (stk) {
    const { CallbackMetadata, ...top } = stk;
    return { kind: 'stk', pairs: [...list(CallbackMetadata?.Item).map((i) => [i.Name, i.Value]), ...Object.entries(top)] };
  }
  if (b2c) {
    const { ResultParameters, ReferenceData, ...top } = b2c;
    return {
      kind: 'b2c',
      pairs: [
        ...list(ResultParameters?.ResultParameter).map((p) => [p.Key, p.Value]),
        ...Object.entries(top).filter(([, v]) => !v || typeof v !== 'object'),
        ...list(ReferenceData?.ReferenceItem).map((p) => [p.Key, p.Value]),
      ],
    };
  }
  return { kind: 'other', pairs: flatten(data) };
}

/** Labelled fields from [M-Pesa name, value] pairs: the M-Pesa ref first, then each name once (its first value wins). */
function toFields(pairs) {
  const known = pairs.filter(([k, v]) => k != null && v != null && v !== '');
  const values = Object.fromEntries([...known].reverse());
  const ref = REF_KEYS.map((k) => values[k]).find((v) => v != null) ?? null;

  // A B2C TransactionID equal to the receipt isn't repeated.
  const seen = new Set();
  const fields = [];
  const add = (key, value) => {
    const shown = display(key, value);
    if (shown == null || seen.has(key)) return;
    if (key === 'TransactionID' && ref != null && String(value) === String(ref) && seen.has('ref')) return;
    seen.add(key);
    fields.push({ key, label: LABELS[key] || humanize(key), value: shown });
  };
  if (ref != null) {
    add(REF_KEYS.find((k) => values[k] === ref), ref);
    seen.add('ref');
  }
  known.forEach(([k, v]) => add(k, v));
  return { ref: ref != null ? String(ref) : null, fields };
}

/**
 * @param {string|object|null} raw — the stored callback (JSON text, as the ledger keeps it)
 * @returns {{ kind: 'stk'|'b2c'|'other', ref: string|null, fields: { key: string, label: string, value: string }[] } | null}
 *   `null` when there's no callback or it isn't JSON
 */
export function parseMpesaCallback(raw) {
  const read = readCallback(raw);
  return read && { kind: read.kind, ...toFields(read.pairs) };
}

/**
 * Every M-Pesa field of a ledger transaction: the ones the backend sends (`mpesaReceiptNumber`…) first, then anything
 * else in its raw callback (a payout's B2C fields, a field Safaricom adds) — `null` when there's neither.
 *
 * @param {object|null} t — a `PaymentTransactionResponse`
 * @returns {{ kind: 'stk'|'b2c'|'other', ref: string|null, fields: { key: string, label: string, value: string }[] } | null}
 */
export function mpesaDetails(t) {
  if (!t) return null;
  const server = SERVER_FIELDS.map(([field, key]) => [key, t[field]]).filter(([, v]) => v != null && v !== '');
  const read = readCallback(t.rawCallback);
  if (!server.length && !read) return null;
  return { kind: read?.kind ?? 'stk', ...toFields([...server, ...(read?.pairs ?? [])]) };
}

/** The M-Pesa ref of a ledger transaction (the backend's, else from its callback), else the provider's own reference. */
export function transactionRef(t) {
  return mpesaDetails(t)?.ref || t?.providerReference || null;
}
