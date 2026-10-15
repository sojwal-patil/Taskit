import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from '../lib/auth';

describe('Authentication & Security', () => {
  it('should securely hash and verify passwords using bcrypt', async () => {
    const password = 'SuperSecretPassword123!';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2')).toBe(true); // bcrypt signature

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword('WrongPassword!', hash);
    expect(isInvalid).toBe(false);
  });

  it('should create and verify signed JWT session tokens with jose', async () => {
    const payload = {
      userId: 'user_test_123',
      email: 'test@taskit.design',
      name: 'Test Engineer',
    };

    const token = await createSessionToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // Standard JWT 3-part structure

    const verified = await verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(payload.userId);
    expect(verified?.email).toBe(payload.email);
    expect(verified?.name).toBe(payload.name);
  });

  it('should reject tampered or invalid session tokens', async () => {
    const validToken = await createSessionToken({
      userId: 'user_real',
      email: 'real@taskit.design',
      name: 'Real User',
    });

    // Tamper with the payload part of the token
    const parts = validToken.split('.');
    const tamperedToken = `${parts[0]}.${parts[1]}tampered.${parts[2]}`;

    const verified = await verifySessionToken(tamperedToken);
    expect(verified).toBeNull();
  });
});
