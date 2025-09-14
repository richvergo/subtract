import CryptoJS from 'crypto-js';

// Get encryption key from environment or use a default for development
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production';

/**
 * Encrypt sensitive data using AES-256
 */
export function encrypt(text: string): string {
  if (!text) return text;
  
  try {
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data using AES-256
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    if (!result) {
      throw new Error('Decryption failed - empty result');
    }
    return result;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Mask sensitive values for API responses
 */
export function maskSensitiveValue(value: string, type: 'email' | 'username' | 'password' | 'token' = 'username'): string {
  if (!value) return value;
  
  switch (type) {
    case 'email':
      // Show first 3 chars and domain: ric***@example.com
      const [localPart, domain] = value.split('@');
      if (localPart.length <= 3) return `${localPart}***@${domain}`;
      return `${localPart.substring(0, 3)}***@${domain}`;
      
    case 'username':
      // Show first 3 chars: ric***
      if (value.length <= 3) return `${value}***`;
      return `${value.substring(0, 3)}***`;
      
    case 'password':
      // Always mask passwords completely
      return '••••••••';
      
    case 'token':
      // Show first 8 chars: abc12345***
      if (value.length <= 8) return '••••••••';
      return `${value.substring(0, 8)}***`;
      
    default:
      return '••••••••';
  }
}

/**
 * Encrypt login credentials before saving to database
 */
export function encryptLoginCredentials(credentials: {
  username: string;
  password?: string;
  oauthToken?: string;
}): {
  username: string;
  password?: string;
  oauthToken?: string;
} {
  return {
    username: encrypt(credentials.username),
    password: credentials.password ? encrypt(credentials.password) : undefined,
    oauthToken: credentials.oauthToken ? encrypt(credentials.oauthToken) : undefined,
  };
}

/**
 * Decrypt login credentials from database
 */
export function decryptLoginCredentials(encryptedCredentials: {
  username: string;
  password?: string | null;
  oauthToken?: string | null;
}): {
  username: string;
  password?: string;
  oauthToken?: string;
} {
  return {
    username: decrypt(encryptedCredentials.username),
    password: encryptedCredentials.password ? decrypt(encryptedCredentials.password) : undefined,
    oauthToken: encryptedCredentials.oauthToken ? decrypt(encryptedCredentials.oauthToken) : undefined,
  };
}

/**
 * Mask login credentials for API responses
 */
export function maskLoginCredentials(credentials: {
  username: string;
  password?: string | null;
  oauthToken?: string | null;
}): {
  username: string;
  password?: string;
  oauthToken?: string;
} {
  return {
    username: maskSensitiveValue(credentials.username, 'email'),
    password: credentials.password ? maskSensitiveValue(credentials.password, 'password') : undefined,
    oauthToken: credentials.oauthToken ? maskSensitiveValue(credentials.oauthToken, 'token') : undefined,
  };
}
