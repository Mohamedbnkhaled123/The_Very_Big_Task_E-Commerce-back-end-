/**
 * Unit tests: email.validator.js (Backend — Node.js / Jest)
 *
 * Run with: npx jest utilities/email.validator.test.js
 */
const { validateEmail } = require('./email.validator');

describe('validateEmail (backend)', () => {

  // ── Valid ────────────────────────────────────────────────────────────────────
  test('accepts a standard email address', () => {
    const r = validateEmail('user@example.com');
    expect(r.valid).toBe(true);
    expect(r.error).toBeNull();
    expect(r.sanitized).toBe('user@example.com');
  });

  test('accepts email with plus, underscores, hyphens', () => {
    expect(validateEmail('user+tag@my-domain.co.uk').valid).toBe(true);
  });

  // ── Sanitization ─────────────────────────────────────────────────────────────
  test('trims and lowercases', () => {
    const r = validateEmail('  TEST@GMAIL.COM  ');
    expect(r.sanitized).toBe('test@gmail.com');
    expect(r.valid).toBe(true);
  });

  // ── Null / empty ──────────────────────────────────────────────────────────────
  test('rejects null', () => expect(validateEmail(null).valid).toBe(false));
  test('rejects empty string', () => expect(validateEmail('').valid).toBe(false));
  test('rejects whitespace only', () => expect(validateEmail('   ').valid).toBe(false));

  // ── Length ─────────────────────────────────────────────────────────────────────
  test('rejects email > 254 chars', () => {
    const long = 'a'.repeat(60) + '@' + 'b'.repeat(60) + '.' + 'c'.repeat(60) + '.com';
    expect(validateEmail(long).valid).toBe(false);
  });

  test('rejects local part > 64 chars', () => {
    expect(validateEmail('a'.repeat(65) + '@example.com').valid).toBe(false);
  });

  test('accepts local part of exactly 64 chars', () => {
    expect(validateEmail('a'.repeat(64) + '@example.com').valid).toBe(true);
  });

  // ── @ sign ────────────────────────────────────────────────────────────────────
  test('rejects missing @', () => expect(validateEmail('userexample.com').valid).toBe(false));
  test('rejects multiple @', () => expect(validateEmail('us@er@example.com').valid).toBe(false));

  // ── Local part rules ──────────────────────────────────────────────────────────
  test('rejects local part starting with dot', () => {
    expect(validateEmail('.user@example.com').valid).toBe(false);
  });

  test('rejects local part ending with dot', () => {
    expect(validateEmail('user.@example.com').valid).toBe(false);
  });

  test('rejects consecutive dots in local part', () => {
    expect(validateEmail('us..er@example.com').valid).toBe(false);
  });

  test('rejects invalid chars in local part', () => {
    expect(validateEmail('user name@example.com').valid).toBe(false);
    expect(validateEmail('user<>@example.com').valid).toBe(false);
  });

  // ── Domain rules ──────────────────────────────────────────────────────────────
  test('rejects domain without dot', () => {
    expect(validateEmail('user@localhost').valid).toBe(false);
  });

  test('rejects domain label starting with hyphen', () => {
    expect(validateEmail('user@-example.com').valid).toBe(false);
  });

  test('rejects domain label ending with hyphen', () => {
    expect(validateEmail('user@example-.com').valid).toBe(false);
  });

  test('rejects domain with consecutive dots', () => {
    expect(validateEmail('user@ex..ample.com').valid).toBe(false);
  });

  test('rejects domain with underscore (not valid in hostname)', () => {
    expect(validateEmail('user@exam_ple.com').valid).toBe(false);
  });

  // ── TLD ─────────────────────────────────────────────────────────────────────
  test('rejects single-char TLD', () => {
    expect(validateEmail('user@example.c').valid).toBe(false);
  });

  test('accepts 2-char TLD', () => {
    expect(validateEmail('user@example.io').valid).toBe(true);
  });
});
