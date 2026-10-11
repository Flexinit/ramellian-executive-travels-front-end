import { describe, it, expect } from 'vitest';
import { stripPhoneNumbers, containsPhoneNumber, PHONE_REMOVED_TEXT } from './contactGuard';

const strip = (t) => stripPhoneNumbers(t).text;

describe('stripPhoneNumbers — Kenyan numbers', () => {
  it.each([
    ['call me on 0712345678 please', `call me on ${PHONE_REMOVED_TEXT} please`],
    ['0712 345 678', PHONE_REMOVED_TEXT],
    ['0712-345-678', PHONE_REMOVED_TEXT],
    ['0712.345.678', PHONE_REMOVED_TEXT],
    ['(0712) 345678', PHONE_REMOVED_TEXT],
    ['011 234 5678', PHONE_REMOVED_TEXT],
    ['0112345678', PHONE_REMOVED_TEXT],
    ['0100 123 456', PHONE_REMOVED_TEXT],
  ])('removes %s', (input, expected) => {
    expect(strip(input)).toBe(expected);
  });

  it('removes a partial number that starts like one (07…, 01…)', () => {
    expect(strip('my number is 0712')).toBe(`my number is ${PHONE_REMOVED_TEXT}`);
    expect(strip('or 011 22')).toBe(`or ${PHONE_REMOVED_TEXT}`);
  });
});

describe('stripPhoneNumbers — country codes', () => {
  it.each([
    '+254712345678',
    '+254 712 345 678',
    '+254-712-345-678',
    '254712345678',
    '00254712345678',
    '00 254 712 345 678',
    '+44 7911 123456',
    '+1 (555) 123-4567',
    '+254 7',
  ])('removes %s', (input) => {
    expect(containsPhoneNumber(`reach me: ${input}`)).toBe(true);
    expect(strip(`reach me: ${input}`)).toBe(`reach me: ${PHONE_REMOVED_TEXT}`);
  });

  it('removes other long digit runs even without a prefix', () => {
    expect(strip('712 345 678')).toBe(PHONE_REMOVED_TEXT);
    expect(strip('whatsapp 7123456789')).toBe(`whatsapp ${PHONE_REMOVED_TEXT}`);
  });
});

describe('stripPhoneNumbers — spelled out', () => {
  it('removes a number written in words', () => {
    expect(strip('call zero seven one two three four five six seven eight')).toBe(`call ${PHONE_REMOVED_TEXT}`);
    expect(strip('Zero Seven, One Two Three Four Five Six Seven')).toBe(PHONE_REMOVED_TEXT);
  });

  it('leaves ordinary use of number words alone', () => {
    expect(strip('I need one car for two days, seven seats please')).toBe('I need one car for two days, seven seats please');
  });
});

describe('stripPhoneNumbers — things that are not phone numbers', () => {
  it.each([
    'Pick up at 09:30 on 2026-10-01',
    'Pick up on 01-10-2026 at 8am',
    'Budget is KES 15,000 per day',
    'Room 12, gate 3, 5 passengers',
    'Flight KQ 100 lands at 07:45',
    'It costs 15 000',
    'Seats 8, boot 2 bags',
    '',
  ])('keeps %j untouched', (input) => {
    expect(stripPhoneNumbers(input)).toEqual({ text: input, removed: false });
  });

  it('handles non-strings safely', () => {
    expect(stripPhoneNumbers(undefined)).toEqual({ text: '', removed: false });
    expect(stripPhoneNumbers(null)).toEqual({ text: '', removed: false });
  });
});

describe('stripPhoneNumbers — reporting', () => {
  it('says whether it removed anything', () => {
    expect(stripPhoneNumbers('text me 0712345678')).toEqual({ text: `text me ${PHONE_REMOVED_TEXT}`, removed: true });
    expect(stripPhoneNumbers('no numbers here').removed).toBe(false);
  });

  it('removes every number in a message', () => {
    expect(strip('0712345678 or +254 733 111 222')).toBe(`${PHONE_REMOVED_TEXT} or ${PHONE_REMOVED_TEXT}`);
  });

  it('is idempotent', () => {
    const once = strip('call 0712345678');
    expect(strip(once)).toBe(once);
  });
});

describe('stripPhoneNumbers — typing a number digit by digit', () => {
  it('swallows digits typed after a removed number, so no tail of it is left visible', () => {
    let text = '';
    for (const ch of 'call me on 0712345678 ok') {
      text = stripPhoneNumbers(text + ch).text;
    }
    expect(text).toBe(`call me on ${PHONE_REMOVED_TEXT} ok`);
  });

  it('keeps reporting that it removed something while the person keeps typing digits', () => {
    expect(stripPhoneNumbers(`${PHONE_REMOVED_TEXT}3`)).toEqual({ text: PHONE_REMOVED_TEXT, removed: true });
    expect(stripPhoneNumbers(`${PHONE_REMOVED_TEXT} 345 678`)).toEqual({ text: PHONE_REMOVED_TEXT, removed: true });
  });

  it('does not swallow ordinary words after a removed number', () => {
    expect(strip(`${PHONE_REMOVED_TEXT} at the gate`)).toBe(`${PHONE_REMOVED_TEXT} at the gate`);
  });
});
