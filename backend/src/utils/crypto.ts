import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

/**
 * Hash a value using bcrypt (one-way, for passwords / secrets)
 */
export async function hashValue(value: string, rounds?: number): Promise<string> {
  return bcrypt.hash(value, rounds ?? config.bcrypt.saltRounds);
}

/**
 * Compare a plain value against a bcrypt hash
 */
export async function compareHash(value: string, hash: string): Promise<boolean> {
  return bcrypt.compare(value, hash);
}

/**
 * Generate a cryptographically secure random string
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate an API key with a prefix format: amp_{env}_{random}
 */
export function generateApiKey(environment = 'live'): { key: string; prefix: string } {
  const random = crypto.randomBytes(24).toString('base64url');
  const key = `amp_${environment}_${random}`;
  const prefix = key.substring(0, 16); // amp_live_xxxx (16 chars for display)
  return { key, prefix };
}

/**
 * Generate an OAuth client ID and secret
 */
export function generateOAuthCredentials(): { clientId: string; clientSecret: string } {
  const clientId = `oauth_${crypto.randomBytes(12).toString('hex')}`;
  const clientSecret = `cs_${crypto.randomBytes(32).toString('base64url')}`;
  return { clientId, clientSecret };
}

/**
 * Generate a webhook secret
 */
export function generateWebhookSecret(): { secret: string; prefix: string } {
  const secret = `whsec_${crypto.randomBytes(32).toString('base64url')}`;
  const prefix = secret.substring(0, 12);
  return { secret, prefix };
}

/**
 * Encrypt a value using AES-256-CBC (for JWT secrets, reversible)
 */
export function encrypt(text: string): string {
  const key = Buffer.from(config.encryption.key.padEnd(KEY_LENGTH).substring(0, KEY_LENGTH));
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an AES-256-CBC encrypted value
 */
export function decrypt(encryptedText: string): string {
  const key = Buffer.from(config.encryption.key.padEnd(KEY_LENGTH).substring(0, KEY_LENGTH));
  const [ivHex, encrypted] = encryptedText.split(':');
  if (!ivHex || !encrypted) {
    throw new Error('Invalid encrypted value format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Create HMAC signature for webhook payloads
 */
export function createHmacSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifyHmacSignature(payload: string, secret: string, signature: string): boolean {
  const expected = createHmacSignature(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

/**
 * Hash an API key or client secret with SHA-256 (fast lookup, not bcrypt)
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}
