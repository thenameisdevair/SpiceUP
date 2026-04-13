/**
 * Mock Auth System for SpiceUP
 *
 * Simulates the full auth flow (email login → OTP → session) without
 * real blockchain interaction. Everything is persisted in localStorage
 * so sessions survive page reloads.
 *
 * Designed to match the same interface as Privy so switching to real
 * auth later is seamless.
 */

import {
  storageGet,
  storageSet,
  storageDelete,
  storageGetJSON,
  storageSetJSON,
} from "@/lib/storage";

// ─── Session shape ───────────────────────────────────────────────
export interface MockSession {
  email: string;
  displayName: string;
  privyUserId: string;
  starknetAddress: string;
  tongoRecipientId: string;
  tongoPrivateKey: string;
  phoneNumber: string | null;
  createdAt: number;
}

const SESSION_KEY = "spiceup.auth.session";
const TEMP_EMAIL_KEY = "spiceup.auth.tempEmail";

// ─── Deterministic Starknet address from email ───────────────────
// Simple hash → hex address. Not cryptographically valid but
// deterministic and visually correct (0x prefix, 66 chars).
function hashString(str: string): number[] {
  // djb2 + xor variant for decent distribution
  let h1 = 5381;
  let h2 = 52711;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = (h1 * 33) ^ ch;
    h2 = (h2 * 33) ^ ch;
  }
  return [(h1 >>> 0), (h2 >>> 0)];
}

function intToHex(n: number, pad: number): string {
  return n.toString(16).padStart(pad, "0");
}

export function generateStarknetAddress(email: string): string {
  const [h1, h2] = hashString(email);
  const prefix = "0x";
  // Build a 64-char hex string from the two hashes
  const hex1 = intToHex(h1, 8);
  const hex2 = intToHex(h2, 8);
  // Repeat to fill 64 hex chars (32 bytes)
  const h3 = intToHex(h1 ^ h2, 8);
  const h4 = intToHex((h1 << 3) ^ (h2 >>> 5), 8);
  const h5 = intToHex((h2 << 7) ^ (h1 >>> 2), 8);
  const h6 = intToHex((h1 + h2), 8);
  const h7 = intToHex((h1 * 17 + h2 * 31), 8);
  const h8 = intToHex((h2 * 13 + h1 * 37), 8);
  const full = `${hex1}${hex2}${h3}${h4}${h5}${h6}${h7}${h8}`;
  return `${prefix}${full.slice(0, 64)}`;
}

// ─── Deterministic Tongo recipient ID from Starknet address ──────
export function generateTongoRecipientId(starknetAddress: string): string {
  const hash = hashString(`tongo:${starknetAddress}`);
  const hex = intToHex(hash[0], 8) + intToHex(hash[1], 8);
  return `0x${hex}${hex}${hex}${hex}`.slice(0, 66);
}

// ─── Generate random Tongo private key via Web Crypto ────────────
export function generateTongoPrivateKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

// ─── Generate a mock Privy user ID ───────────────────────────────
function generatePrivyUserId(email: string): string {
  const [h1, h2] = hashString(`privy:${email}`);
  return `mock-${intToHex(h1, 8)}${intToHex(h2, 8)}`;
}

// ─── Extract display name from email ─────────────────────────────
function extractDisplayName(email: string): string {
  const local = email.split("@")[0];
  // Capitalize first letter, replace dots/underscores with spaces
  return local
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Create a new session ────────────────────────────────────────
export async function createMockSession(email: string): Promise<MockSession> {
  const starknetAddress = generateStarknetAddress(email);
  const tongoPrivateKey = generateTongoPrivateKey();
  const tongoRecipientId = generateTongoRecipientId(starknetAddress);

  const session: MockSession = {
    email,
    displayName: extractDisplayName(email),
    privyUserId: generatePrivyUserId(email),
    starknetAddress,
    tongoRecipientId,
    tongoPrivateKey,
    phoneNumber: null,
    createdAt: Date.now(),
  };

  // Persist everything
  await storageSetJSON(SESSION_KEY, session);
  await storageSet("spiceup.tongo.privateKey", tongoPrivateKey);

  // Clear temp email
  await storageDelete(TEMP_EMAIL_KEY);

  return session;
}

// ─── Store temporary email (between login and OTP) ───────────────
export async function setTempEmail(email: string): Promise<void> {
  await storageSet(TEMP_EMAIL_KEY, email);
}

export async function getTempEmail(): Promise<string | null> {
  return storageGet(TEMP_EMAIL_KEY);
}

export async function clearTempEmail(): Promise<void> {
  await storageDelete(TEMP_EMAIL_KEY);
}

// ─── Load existing session ───────────────────────────────────────
export async function loadSession(): Promise<MockSession | null> {
  const session = await storageGetJSON<MockSession>(SESSION_KEY);
  if (!session) return null;

  // Verify required fields
  if (!session.starknetAddress || !session.tongoRecipientId) return null;

  return session;
}

// ─── Update phone number ─────────────────────────────────────────
export async function updatePhoneNumber(phone: string): Promise<void> {
  const session = await loadSession();
  if (!session) return;
  session.phoneNumber = phone;
  await storageSetJSON(SESSION_KEY, session);
  await storageSet("spiceup.user.phone", phone);
}

// ─── Destroy session (logout) ────────────────────────────────────
export async function destroySession(): Promise<void> {
  await storageDelete(SESSION_KEY);
  await storageDelete(TEMP_EMAIL_KEY);
  await storageDelete("spiceup.tongo.privateKey");
  await storageDelete("spiceup.user.phone");
}

// ─── Email validation ────────────────────────────────────────────
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── OTP validation (mock: accept any 6 digits) ─────────────────
export function isValidOTP(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}
