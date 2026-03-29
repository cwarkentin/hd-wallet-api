import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt } from '../../crypto/encryption.js';

beforeAll(() => {
  process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
});

describe('encryption', () => {
  it('encrypts and decrypts a mnemonic correctly', () => {
    const mnemonic = 'witch collapse practice feed shame open despair creek road again ice least';
    const ciphertext = encrypt(mnemonic);
    const decrypted = decrypt(ciphertext);
    expect(decrypted).toBe(mnemonic);
  });

  it('produces different ciphertext each time for the same input', () => {
    const mnemonic = 'witch collapse practice feed shame open despair creek road again ice least';
    const first = encrypt(mnemonic);
    const second = encrypt(mnemonic);
    expect(first).not.toBe(second);
  });

  it('throws on tampered ciphertext', () => {
    const mnemonic = 'witch collapse practice feed shame open despair creek road again ice least';
    const ciphertext = encrypt(mnemonic);
    const [iv, tag, data] = ciphertext.split(':');
    const tampered = `${iv}:${tag}:ffffffffffffffff${data}`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it('throws if encryption key is wrong length', () => {
    process.env.ENCRYPTION_KEY = 'tooshort';
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be 32 characters');
    process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
  });
});