import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  generateSalt,
  generateVerificationCode,
  savePendingVerification,
  getPendingVerification,
  verifyCode,
  clearPendingVerification,
  clearAllAuthStorage,
} from '../domain/authService';

describe('authService', () => {
  beforeEach(() => {
    clearAllAuthStorage();
  });

  it('hashes password with salt using SHA-256', async () => {
    const salt = generateSalt();
    const hash1 = await hashPassword('secretPassword123', salt);
    const hash2 = await hashPassword('secretPassword123', salt);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex is 64 chars

    const differentSalt = generateSalt();
    const hash3 = await hashPassword('secretPassword123', differentSalt);
    expect(hash1).not.toBe(hash3);
  });

  it('generates a 6-digit numeric verification code', () => {
    const code = generateVerificationCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('saves, retrieves, and verifies pending registration code', () => {
    const email = 'user@example.com';
    const code = '482195';

    savePendingVerification({
      email,
      code,
      type: 'register',
      name: 'Атлет',
      passwordHash: 'dummyHash',
      salt: 'dummySalt',
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const pending = getPendingVerification(email, 'register');
    expect(pending).not.toBeNull();
    expect(pending?.code).toBe(code);

    // Wrong code
    const checkWrong = verifyCode(email, '000000', 'register');
    expect(checkWrong.valid).toBe(false);

    // Correct code
    const checkCorrect = verifyCode(email, '482 195', 'register'); // with spaces
    expect(checkCorrect.valid).toBe(true);
    expect(checkCorrect.pending?.name).toBe('Атлет');

    // Clear after use
    clearPendingVerification(email, 'register');
    expect(getPendingVerification(email, 'register')).toBeNull();
  });

  it('handles password reset code expiration', () => {
    const email = 'reset@example.com';
    const code = '999888';

    // Expired 1 second ago
    savePendingVerification({
      email,
      code,
      type: 'reset',
      expiresAt: Date.now() - 1000,
    });

    const check = verifyCode(email, code, 'reset');
    expect(check.valid).toBe(false);
    expect(check.error).toContain('истёк');
  });
});
