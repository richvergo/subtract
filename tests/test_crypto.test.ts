/**
 * Unit tests for crypto utilities
 * Tests encryption, decryption, and credential masking
 */

import {
  encrypt,
  decrypt,
  maskSensitiveValue,
  encryptLoginCredentials,
  decryptLoginCredentials,
  maskLoginCredentials,
} from '../src/lib/encryption';

describe('Crypto Utilities', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const originalText = 'sensitive-data-123';
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);

      expect(encrypted).not.toBe(originalText);
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64-like format
      expect(decrypted).toBe(originalText);
    });

    it('should handle empty strings', () => {
      const emptyString = '';
      const encrypted = encrypt(emptyString);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(emptyString);
    });

    it('should handle special characters', () => {
      const specialText = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encrypt(specialText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(specialText);
    });

    it('should handle unicode characters', () => {
      const unicodeText = '测试数据 🚀 émojis';
      const encrypted = encrypt(unicodeText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(unicodeText);
    });

    it('should throw error for invalid encrypted data', () => {
      expect(() => decrypt('invalid-encrypted-data')).toThrow('Failed to decrypt data');
    });
  });

  describe('maskSensitiveValue', () => {
    it('should mask email addresses correctly', () => {
      const email = 'richard.kane@example.com';
      const masked = maskSensitiveValue(email, 'email');
      
      expect(masked).toBe('ric***@example.com');
    });

    it('should mask short email addresses', () => {
      const shortEmail = 'ab@example.com';
      const masked = maskSensitiveValue(shortEmail, 'email');
      
      expect(masked).toBe('ab***@example.com');
    });

    it('should mask usernames correctly', () => {
      const username = 'richardkane';
      const masked = maskSensitiveValue(username, 'username');
      
      expect(masked).toBe('ric***');
    });

    it('should mask short usernames', () => {
      const shortUsername = 'ab';
      const masked = maskSensitiveValue(shortUsername, 'username');
      
      expect(masked).toBe('ab***');
    });

    it('should mask passwords completely', () => {
      const password = 'super-secret-password-123';
      const masked = maskSensitiveValue(password, 'password');
      
      expect(masked).toBe('••••••••');
    });

    it('should mask tokens correctly', () => {
      const token = 'abc12345def67890ghi';
      const masked = maskSensitiveValue(token, 'token');
      
      expect(masked).toBe('abc12345***');
    });

    it('should mask short tokens', () => {
      const shortToken = 'abc123';
      const masked = maskSensitiveValue(shortToken, 'token');
      
      expect(masked).toBe('••••••••');
    });

    it('should handle empty values', () => {
      expect(maskSensitiveValue('', 'username')).toBe('');
      expect(maskSensitiveValue('', 'password')).toBe('');
    });
  });

  describe('encryptLoginCredentials', () => {
    it('should encrypt all credential fields', () => {
      const credentials = {
        username: 'test@example.com',
        password: 'secret123',
        oauthToken: 'oauth-token-123',
      };

      const encrypted = encryptLoginCredentials(credentials);

      expect(encrypted.username).not.toBe(credentials.username);
      expect(encrypted.password).not.toBe(credentials.password);
      expect(encrypted.oauthToken).not.toBe(credentials.oauthToken);

      // Verify they can be decrypted
      const decrypted = decryptLoginCredentials(encrypted);
      expect(decrypted.username).toBe(credentials.username);
      expect(decrypted.password).toBe(credentials.password);
      expect(decrypted.oauthToken).toBe(credentials.oauthToken);
    });

    it('should handle optional fields', () => {
      const credentials = {
        username: 'test@example.com',
        password: undefined,
        oauthToken: undefined,
      };

      const encrypted = encryptLoginCredentials(credentials);
      expect(encrypted.password).toBeUndefined();
      expect(encrypted.oauthToken).toBeUndefined();
    });
  });

  describe('decryptLoginCredentials', () => {
    it('should decrypt all credential fields', () => {
      const originalCredentials = {
        username: 'test@example.com',
        password: 'secret123',
        oauthToken: 'oauth-token-123',
      };

      const encrypted = encryptLoginCredentials(originalCredentials);
      const decrypted = decryptLoginCredentials(encrypted);

      expect(decrypted.username).toBe(originalCredentials.username);
      expect(decrypted.password).toBe(originalCredentials.password);
      expect(decrypted.oauthToken).toBe(originalCredentials.oauthToken);
    });

    it('should handle null values from database', () => {
      const encryptedCredentials = {
        username: encrypt('test@example.com'),
        password: null,
        oauthToken: null,
      };

      const decrypted = decryptLoginCredentials(encryptedCredentials);

      expect(decrypted.username).toBe('test@example.com');
      expect(decrypted.password).toBeUndefined();
      expect(decrypted.oauthToken).toBeUndefined();
    });
  });

  describe('maskLoginCredentials', () => {
    it('should mask all credential fields for API responses', () => {
      const credentials = {
        username: 'richard.kane@example.com',
        password: 'super-secret-password',
        oauthToken: 'abc12345def67890ghi',
      };

      const masked = maskLoginCredentials(credentials);

      expect(masked.username).toBe('ric***@example.com');
      expect(masked.password).toBe('••••••••');
      expect(masked.oauthToken).toBe('abc12345***');
    });

    it('should handle null values', () => {
      const credentials = {
        username: 'test@example.com',
        password: null,
        oauthToken: null,
      };

      const masked = maskLoginCredentials(credentials);

      expect(masked.username).toBe('tes***@example.com');
      expect(masked.password).toBeUndefined();
      expect(masked.oauthToken).toBeUndefined();
    });
  });

  describe('roundtrip encryption/decryption', () => {
    it('should maintain data integrity through full roundtrip', () => {
      const originalCredentials = {
        username: 'test.user@company.com',
        password: 'ComplexP@ssw0rd!',
        oauthToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      };

      // Encrypt → Decrypt → Mask
      const encrypted = encryptLoginCredentials(originalCredentials);
      const decrypted = decryptLoginCredentials(encrypted);
      const masked = maskLoginCredentials(encrypted);

      // Verify decrypted data matches original
      expect(decrypted.username).toBe(originalCredentials.username);
      expect(decrypted.password).toBe(originalCredentials.password);
      expect(decrypted.oauthToken).toBe(originalCredentials.oauthToken);

      // Verify masked data is properly masked
      expect(masked.username).not.toBe(originalCredentials.username);
      expect(masked.password).toBe('••••••••');
      expect(masked.oauthToken).not.toBe(originalCredentials.oauthToken);
    });
  });
});
