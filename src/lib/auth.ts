import { STORAGE_KEYS, storageDelete, storageGet, storageSet } from "@/lib/storage";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null
    ? (value as UnknownRecord)
    : null;
}

function readStringField(source: unknown, key: string): string | null {
  const record = asRecord(source);
  if (!record) return null;

  const value = record[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function readNestedString(source: unknown, path: string[]): string | null {
  let current: unknown = source;

  for (const key of path) {
    const record = asRecord(current);
    if (!record) return null;
    current = record[key];
  }

  return typeof current === "string" && current.trim() ? current : null;
}

function getLinkedAccounts(user: unknown): UnknownRecord[] {
  const linkedAccounts = asRecord(user)?.linkedAccounts;
  if (!Array.isArray(linkedAccounts)) return [];

  return linkedAccounts
    .map((account) => asRecord(account))
    .filter((account): account is UnknownRecord => account !== null);
}

function findLinkedAccount(user: unknown, types: string[]): UnknownRecord | null {
  const accounts = getLinkedAccounts(user);

  for (const account of accounts) {
    const type = readStringField(account, "type");
    if (type && types.includes(type)) {
      return account;
    }
  }

  return null;
}

function titleizeEmailLocalPart(email: string): string {
  return email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export async function setPendingAuthEmail(email: string) {
  await storageSet(STORAGE_KEYS.tempEmail, email);
}

export async function getPendingAuthEmail() {
  return storageGet(STORAGE_KEYS.tempEmail);
}

export async function clearPendingAuthEmail() {
  await storageDelete(STORAGE_KEYS.tempEmail);
}

export async function setStoredPhoneNumber(phoneNumber: string) {
  await storageSet(STORAGE_KEYS.phoneNumber, phoneNumber);
}

export async function getStoredPhoneNumber() {
  return storageGet(STORAGE_KEYS.phoneNumber);
}

export async function clearStoredPhoneNumber() {
  await storageDelete(STORAGE_KEYS.phoneNumber);
}

export function getPrivyEmail(user: unknown): string | null {
  return (
    readNestedString(user, ["email", "address"]) ??
    readNestedString(user, ["email", "email"]) ??
    readStringField(findLinkedAccount(user, ["email"]), "address") ??
    readStringField(findLinkedAccount(user, ["email"]), "email") ??
    readStringField(findLinkedAccount(user, ["google_oauth"]), "email") ??
    readStringField(findLinkedAccount(user, ["apple_oauth"]), "email") ??
    null
  );
}

export function getPrivyPhone(user: unknown): string | null {
  return (
    readNestedString(user, ["phone", "number"]) ??
    readStringField(findLinkedAccount(user, ["phone"]), "phoneNumber") ??
    readStringField(findLinkedAccount(user, ["phone"]), "number") ??
    null
  );
}

export function getPrivyDisplayName(user: unknown): string | null {
  return (
    readStringField(user, "displayName") ??
    readStringField(user, "name") ??
    readStringField(findLinkedAccount(user, ["google_oauth"]), "name") ??
    readStringField(findLinkedAccount(user, ["apple_oauth"]), "name") ??
    (() => {
      const email = getPrivyEmail(user);
      return email ? titleizeEmailLocalPart(email) : null;
    })()
  );
}

export function getWalletAddress(
  user: unknown,
  wallets: unknown[] | undefined
): string | null {
  if (Array.isArray(wallets)) {
    for (const wallet of wallets) {
      const address = readStringField(wallet, "address");
      if (address) return address;
    }
  }

  return (
    readNestedString(user, ["wallet", "address"]) ??
    readStringField(findLinkedAccount(user, ["wallet"]), "address") ??
    readStringField(findLinkedAccount(user, ["embedded_wallet"]), "address") ??
    null
  );
}
