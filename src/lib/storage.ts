/**
 * localStorage wrapper for SpiceUP
 * Replaces expo-secure-store / AsyncStorage from React Native
 * Keys are namespaced under "spiceup." to avoid collisions
 */

const NAMESPACE = "spiceup.";

export const STORAGE_KEYS = {
  tongoPrivateKey: `${NAMESPACE}tongo.privateKey`,
  phoneNumber: `${NAMESPACE}user.phone`,
  onboardingComplete: `${NAMESPACE}onboardingComplete`,
  currencyPreference: `${NAMESPACE}prefs.currency`,
  authSession: `${NAMESPACE}auth.session`,
  tempEmail: `${NAMESPACE}auth.tempEmail`,
} as const;

export async function storageGet(key: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function storageSet(key: string, value: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage may be full or unavailable
  }
}

export async function storageDelete(key: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
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
