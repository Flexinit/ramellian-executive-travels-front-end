import { describe, it, expect } from 'vitest';
import { mpesaDetails, parseMpesaCallback, transactionRef } from './mpesaCallback';
import { formatDateTime } from './utils';

// 12:30:45 on 4 Nov 2026, Kenya time — as this machine shows it.
const PAID_AT = formatDateTime(new Date('2026-11-04T12:30:45+03:00'));

const STK_OK = JSON.stringify({
  Body: {
    stkCallback: {
      MerchantRequestID: '29115-34620561-1',
      CheckoutRequestID: 'ws_CO_191220191020363925',
      ResultCode: 0,
      ResultDesc: 'The service request is processed successfully.',
      CallbackMetadata: {
        Item: [
          { Name: 'Amount', Value: 5000 },
          { Name: 'MpesaReceiptNumber', Value: 'NLJ7RT61SV' },
          { Name: 'Balance' },
          { Name: 'TransactionDate', Value: 20261104123045 },
          { Name: 'PhoneNumber', Value: 254712345678 },
        ],
      },
    },
  },
});

const STK_CANCELLED = JSON.stringify({
  Body: { stkCallback: { MerchantRequestID: 'm1', CheckoutRequestID: 'ws_CO_1', ResultCode: 1032, ResultDesc: 'Request cancelled by user' } },
});

const B2C = JSON.stringify({
  Result: {
    ResultType: 0,
    ResultCode: 0,
    ResultDesc: 'The service request is processed successfully.',
    OriginatorConversationID: '10571-7910404-1',
    ConversationID: 'AG_20191219_00004e48cf7e3533f581',
    TransactionID: 'NLJ41HAY6Q',
    ResultParameters: {
      ResultParameter: [
        { Key: 'TransactionAmount', Value: 4000 },
        { Key: 'TransactionReceipt', Value: 'NLJ41HAY6Q' },
        { Key: 'B2CRecipientIsRegisteredCustomer', Value: 'Y' },
        { Key: 'B2CChargesPaidAccountAvailableFunds', Value: -4510.0 },
        { Key: 'ReceiverPartyPublicName', Value: '254712345678 - Owner Otieno' },
        { Key: 'TransactionCompletedDateTime', Value: '04.11.2026 12:30:45' },
        { Key: 'B2CUtilityAccountAvailableFunds', Value: 10116.0 },
        { Key: 'B2CWorkingAccountAvailableFunds', Value: 900000.0 },
      ],
    },
    ReferenceData: { ReferenceItem: { Key: 'QueueTimeoutURL', Value: 'https://internalsandbox.safaricom.co.ke/mpesa/b2cresults/v1/submit' } },
  },
});

const labels = (r) => r.fields.map((f) => f.label);
const value = (r, label) => r.fields.find((f) => f.label === label)?.value;

describe('parseMpesaCallback', () => {
  it('reads every field of an STK push callback, M-Pesa ref first', () => {
    const r = parseMpesaCallback(STK_OK);
    expect(r.kind).toBe('stk');
    expect(r.ref).toBe('NLJ7RT61SV');
    expect(labels(r)).toEqual([
      'M-Pesa ref', 'Amount', 'Paid at', 'Phone', 'Merchant request ID', 'Checkout request ID', 'Result code', 'Result',
    ]);
    expect(value(r, 'Amount')).toMatch(/5,000/);
    expect(value(r, 'Paid at')).toBe(PAID_AT);
    expect(value(r, 'Phone')).toBe('254712345678');
    expect(value(r, 'Checkout request ID')).toBe('ws_CO_191220191020363925');
  });

  it('reads a cancelled STK push, which has no M-Pesa ref', () => {
    const r = parseMpesaCallback(STK_CANCELLED);
    expect(r.ref).toBeNull();
    expect(value(r, 'Result code')).toBe('1032');
    expect(value(r, 'Result')).toBe('Request cancelled by user');
  });

  it('reads every field of a B2C payout result, without repeating the ref as the transaction ID', () => {
    const r = parseMpesaCallback(B2C);
    expect(r.kind).toBe('b2c');
    expect(r.ref).toBe('NLJ41HAY6Q');
    expect(labels(r)[0]).toBe('M-Pesa ref');
    expect(labels(r)).not.toContain('Transaction ID');
    expect(value(r, 'Paid to')).toBe('254712345678 - Owner Otieno');
    expect(value(r, 'Registered M-Pesa customer')).toBe('Yes');
    expect(value(r, 'Conversation ID')).toBe('AG_20191219_00004e48cf7e3533f581');
    expect(value(r, 'Originator conversation ID')).toBe('10571-7910404-1');
    expect(value(r, 'Completed at')).toBe(PAID_AT);
    expect(value(r, 'Queue timeout URL')).toMatch(/safaricom/);
    expect(labels(r)).toEqual(expect.arrayContaining(['Utility account balance', 'Working account balance', 'Charges account balance']));
  });

  it('lists every value of a payload it does not know, by its own name', () => {
    const r = parseMpesaCallback('{"OrderTrackingId":"abc","status_code":1,"nested":{"PaymentMethod":"Visa"}}');
    expect(r.kind).toBe('other');
    expect(labels(r)).toEqual(['Order tracking ID', 'Status code', 'Payment method']);
  });

  it('gives nothing back for no callback or one that is not JSON', () => {
    expect(parseMpesaCallback(null)).toBeNull();
    expect(parseMpesaCallback('not json')).toBeNull();
  });
});

describe('mpesaDetails', () => {
  it("reads the backend's own M-Pesa fields, with no callback at all", () => {
    const r = mpesaDetails({
      mpesaReceiptNumber: 'TKB1XYZ9', mpesaTransactionDate: '20261104123045', mpesaPhoneNumber: '254712345678',
      mpesaBalance: '', mpesaMerchantRequestId: '29115-1', mpesaCheckoutRequestId: 'ws_CO_1', mpesaResultCode: 0,
      mpesaResultDesc: 'Processed successfully.',
    });
    expect(r.ref).toBe('TKB1XYZ9');
    expect(labels(r)).toEqual(['M-Pesa ref', 'Paid at', 'Phone', 'Merchant request ID', 'Checkout request ID', 'Result code', 'Result']);
    expect(value(r, 'Result code')).toBe('0');
  });

  it("prefers the backend's fields and adds what only the callback has, each once", () => {
    const r = mpesaDetails({ mpesaReceiptNumber: 'FROM_SERVER', mpesaResultCode: 0, rawCallback: STK_OK });
    expect(r.ref).toBe('FROM_SERVER');
    expect(labels(r).filter((l) => l === 'M-Pesa ref')).toHaveLength(1);
    expect(labels(r)).toEqual(expect.arrayContaining(['Amount', 'Checkout request ID', 'Phone']));
  });

  it("keeps a payout's B2C fields from its callback", () => {
    const r = mpesaDetails({ rawCallback: B2C });
    expect(r.kind).toBe('b2c');
    expect(value(r, 'Paid to')).toBe('254712345678 - Owner Otieno');
  });

  it('gives nothing back for a transaction with no M-Pesa data', () => {
    expect(mpesaDetails({ providerReference: 'PSP-9' })).toBeNull();
    expect(mpesaDetails(null)).toBeNull();
  });
});

describe('M-Pesa transaction dates', () => {
  it.each([
    ['20261104123045', 'M-Pesa YYYYMMDDHHmmss'],
    [20261104123045, 'the same as a number'],
    ['2.0261104123045E13', 'the same as a Java double'],
    ['04.11.2026 12:30:45', 'a B2C DD.MM.YYYY'],
    ['2026-11-04T12:30:45', 'ISO without a zone (Kenya time)'],
    ['2026-11-04 12:30:45', 'ISO with a space'],
    ['2026-11-04T09:30:45Z', 'ISO in UTC'],
    ['2026-11-04T12:30:45+03:00', 'ISO with its zone'],
  ])('reads %s (%s) as a readable date', (raw) => {
    expect(value(mpesaDetails({ mpesaTransactionDate: raw }), 'Paid at')).toBe(PAID_AT);
  });

  it('shows the date like "04 Nov 2026, 12:30 PM"', () => {
    expect(PAID_AT).toMatch(/^\d{2} [A-Z][a-z]{2} 2026, \d{2}:\d{2} (AM|PM)$/i);
  });

  it('leaves a date it cannot read as sent', () => {
    expect(value(mpesaDetails({ mpesaTransactionDate: 'yesterday' }), 'Paid at')).toBe('yesterday');
  });
});

describe('transactionRef', () => {
  it("takes the backend's M-Pesa ref first", () => {
    expect(transactionRef({ mpesaReceiptNumber: 'TKB1XYZ9', rawCallback: STK_OK, providerReference: 'ws_CO_1' })).toBe('TKB1XYZ9');
  });

  it('takes the M-Pesa ref from the callback, else the provider reference', () => {
    expect(transactionRef({ rawCallback: STK_OK, providerReference: 'ws_CO_1' })).toBe('NLJ7RT61SV');
    expect(transactionRef({ rawCallback: STK_CANCELLED, providerReference: 'ws_CO_1' })).toBe('ws_CO_1');
    expect(transactionRef({ providerReference: 'PSP-9' })).toBe('PSP-9');
  });
});
