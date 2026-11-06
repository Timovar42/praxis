/**
 * Authentication & Email Verification Service for Praxis
 * Handles password hashing (SHA-256 + salt), verification codes, and secure storage.
 */

export interface PendingVerification {
  email: string;
  code: string;
  type: 'register' | 'reset';
  name?: string;
  passwordHash?: string;
  salt?: string;
  expiresAt: number;
}

const PENDING_CODES_KEY = 'praxis_pending_auth_codes';

// Fallback in-memory storage for test runners / environments without window.localStorage
const inMemoryStore = new Map<string, string>();

function getStorageItem(key: string): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return inMemoryStore.get(key) ?? null;
    }
  }
  return inMemoryStore.get(key) ?? null;
}

function setStorageItem(key: string, value: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, value);
      return;
    } catch {}
  }
  inMemoryStore.set(key, value);
}

function removeStorageItem(key: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(key);
      return;
    } catch {}
  }
  inMemoryStore.delete(key);
}

export function clearAllAuthStorage(): void {
  removeStorageItem(PENDING_CODES_KEY);
  inMemoryStore.clear();
}

/**
 * Computes SHA-256 hash of password with salt using standard Web Crypto API
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(password + '::praxis_salt::' + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates random cryptographic salt
 */
export function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Loads all pending codes from localStorage
 */
function loadPendingCodes(): PendingVerification[] {
  try {
    const raw = getStorageItem(PENDING_CODES_KEY);
    if (!raw) return [];
    const list: PendingVerification[] = JSON.parse(raw);
    const now = Date.now();
    // Filter out expired codes
    return list.filter((p) => p.expiresAt > now);
  } catch {
    return [];
  }
}

/**
 * Saves pending verification
 */
export function savePendingVerification(item: PendingVerification): void {
  const current = loadPendingCodes().filter(
    (p) => !(p.email.toLowerCase() === item.email.toLowerCase() && p.type === item.type)
  );
  current.push(item);
  setStorageItem(PENDING_CODES_KEY, JSON.stringify(current));

  // Dispatch custom event so the UI immediately surfaces the notification
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('praxis:auth-code', {
          detail: {
            email: item.email,
            code: item.code,
            type: item.type,
            expiresAt: item.expiresAt,
          },
        })
      );
    } catch {}

    // Request native browser notification if supported and allowed
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Код подтверждения Praxis', {
          body: `Ваш 6-значный код для ${item.type === 'register' ? 'регистрации' : 'сброса пароля'}: ${item.code}`,
          icon: '/praxis/favicon.ico',
        });
      } catch {}
    }
  }
}

/**
 * Retrieves pending verification for an email and action type
 */
export function getPendingVerification(
  email: string,
  type: 'register' | 'reset'
): PendingVerification | null {
  const list = loadPendingCodes();
  const norm = email.trim().toLowerCase();
  const found = list.find((p) => p.email.toLowerCase() === norm && p.type === type);
  if (!found) return null;
  if (found.expiresAt < Date.now()) {
    clearPendingVerification(email, type);
    return null;
  }
  return found;
}

/**
 * Clears pending verification after successful usage
 */
export function clearPendingVerification(email: string, type: 'register' | 'reset'): void {
  const list = loadPendingCodes();
  const norm = email.trim().toLowerCase();
  const remaining = list.filter(
    (p) => !(p.email.toLowerCase() === norm && p.type === type)
  );
  setStorageItem(PENDING_CODES_KEY, JSON.stringify(remaining));
}

/**
 * Validates a submitted 6-digit code
 */
export function verifyCode(
  email: string,
  enteredCode: string,
  type: 'register' | 'reset'
): { valid: boolean; error?: string; pending?: PendingVerification } {
  const pending = getPendingVerification(email, type);
  if (!pending) {
    return {
      valid: false,
      error: 'Код подтверждения не найден или срок его действия (10 минут) истёк. Запросите код заново.',
    };
  }

  const cleanEntered = enteredCode.replace(/\s+/g, '').trim();
  const cleanPending = pending.code.replace(/\s+/g, '').trim();

  if (cleanEntered !== cleanPending) {
    return {
      valid: false,
      error: 'Неверный код подтверждения. Проверьте правильность ввода всех 6 цифр.',
    };
  }

  return { valid: true, pending };
}
