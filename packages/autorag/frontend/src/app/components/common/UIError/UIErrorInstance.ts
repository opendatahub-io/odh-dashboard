// Modules -------------------------------------------------------------------->

import type { UIError } from './types';

// Types ---------------------------------------------------------------------->

// Globals -------------------------------------------------------------------->

// Private -------------------------------------------------------------------->

/**
 * Generates a UUID v4 string
 * Uses crypto.randomUUID if available, otherwise falls back to crypto.getRandomValues
 */
function id(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Use crypto.getRandomValues for cryptographically secure fallback
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    return Array.from(bytes, (byte, i) => {
      const hex = byte.toString(16).padStart(2, '0');
      return [4, 6, 8, 10].includes(i) ? `-${hex}` : hex;
    }).join('');
  }

  return `${new Date().toISOString()}__${Math.random().toString(36).slice(2)}`;
}

// Classes -------------------------------------------------------------------->

export class UIErrorInstance extends Error implements UIError {
  messageId: string;

  reason: string;

  status: number;

  transactionId: string;

  details: Record<string, unknown>;

  readonly id: string;

  constructor(uiError: UIError) {
    super(uiError.reason);
    this.name = 'UIError';
    this.messageId = uiError.messageId;
    this.reason = uiError.reason;
    this.status = uiError.status;
    this.transactionId = uiError.transactionId;
    this.details = uiError.details;

    this.id = id();
  }
}
