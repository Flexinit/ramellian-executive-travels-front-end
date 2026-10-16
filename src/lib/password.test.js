import { describe, it, expect } from 'vitest';
import { passwordProblem, newPasswordField } from './password';

describe('password rules', () => {
  it('accepts 8+ characters with a letter, a number and a symbol', () => {
    expect(passwordProblem('Safari2026!')).toBeNull();
    expect(newPasswordField.safeParse('abc123$%').success).toBe(true);
  });

  it('says exactly what is missing', () => {
    expect(passwordProblem('abc')).toMatch(/at least 8 characters.*a number.*a symbol/);
    expect(passwordProblem('password1')).toMatch(/a symbol/);
    expect(passwordProblem('12345678!')).toMatch(/a letter/);
    expect(passwordProblem('a1!'.repeat(30))).toMatch(/at most 72/i);
  });
});
