import { describe, it, expect } from 'vitest';
import { normalizePhone, isValidPhone, phoneField } from './phone';

describe('normalizePhone', () => {
  it.each([
    ['0712 345 678', '+254712345678'],
    ['0712-345-678', '+254712345678'],
    ['712345678', '+254712345678'],
    ['254712345678', '+254712345678'],
    ['+254 712 345 678', '+254712345678'],
    ['00254712345678', '+254712345678'],
    ['0112 345 678', '+254112345678'],
    ['+44 20 7946 0958', '+442079460958'],
    ['+1 (415) 555-2671', '+14155552671'],
  ])('reads %s as %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([
    '', '12345', '0812 345 678', '07123456', '071234567890', 'call me', '+254 812 345 678', '4155552671',
  ])('refuses %s', (input) => {
    expect(isValidPhone(input)).toBe(false);
  });
});

describe('phoneField', () => {
  it('passes a valid number on in the standard form, and explains a wrong one', () => {
    expect(phoneField.parse(' 0712 345 678 ')).toBe('+254712345678');
    const result = phoneField.safeParse('0712');
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/valid phone number/i);
  });
});
