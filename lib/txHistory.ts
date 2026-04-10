import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "spiceup.txHistory";

export interface TxRecord {
  id: string;
  type: "send" | "receive" | "fund" | "withdraw" | "rollover";
  amount: string;       // human-readable (e.g. "1.5")
  token: string;        // symbol (e.g. "ETH")
  counterparty: string; // address or "self"
  timestamp: number;    // Date.now()
  txHash: string;
  isPrivate: boolean;
}

export async function getTxHistory(): Promise<TxRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as TxRecord[];
}

export async function saveTx(record: TxRecord): Promise<void> {
  const history = await getTxHistory();
  history.unshift(record); // newest first
  // Keep last 200 records
  if (history.length > 200) history.length = 200;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
