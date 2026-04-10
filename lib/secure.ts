import * as SecureStore from "expo-secure-store";

const KEYS = {
  tongoPrivateKey: "spiceup.tongo.privateKey",
  phoneNumber: "spiceup.user.phone",
} as const;
type Key = keyof typeof KEYS;

export async function secureGet(key: Key): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS[key]);
}

export async function secureSet(key: Key, value: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS[key], value);
}

export async function secureDelete(key: Key): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS[key]);
}
