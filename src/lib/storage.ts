/**
 * Storage layer for SpiceUP
 *
 * Uses idb-keyval (IndexedDB) for sensitive data like Tongo private keys.
 * Falls back to localStorage for non-sensitive preferences and session data.
 */

import { get, set, del } from "idb-keyval";

const NAMESPACE = "spiceup.";

export const STORAGE_KEYS = {
  tongoPrivateKey: `${NAMESPACE}tongo.privateKey`,
  phoneNumber: `${NAMESPACE}user.phone`,
  onboardingComplete: `${NAMESPACE}onboardingComplete`,
  currencyPreference: `${NAMESPACE}prefs.currency`,
  authSession: `${NAMESPACE}auth.session`,
  tempEmail: `${NAMESPACE}auth.tempEmail`,
} as const;

/** Keys that should be stored in IndexedDB for security */
const IDB_KEYS = new Set([STORAGE_KEYS.tongoPrivateKey]);

// ─── Unified get/set/delete ──────────────────────────────────

export async function storageGet(key: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    if (IDB_KEYS.has(key)) {
      const val = await get<string>(key);
      return val ?? null;
    }
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function storageSet(key: string, value: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (IDB_KEYS.has(key)) {
      await set(key, value);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // storage may be full or unavailable
  }
}

export async function storageDelete(key: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (IDB_KEYS.has(key)) {
      await del(key);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

export async function storageGetJSON<T>(key: string): Promise<T | null> {
  const raw = await storageGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function storageSetJSON<T>(key: string, value: T): Promise<void> {
  await storageSet(key, JSON.stringify(value));
}
