// __mocks__/setup.ts
// Runs via setupFiles — before the test framework, so no beforeEach/afterEach.

// -- expo-secure-store --------------------------------------------------------
const mockSecureStoreData = new Map<string, string>();

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn((key: string) =>
    Promise.resolve(mockSecureStoreData.get(key) ?? null)
  ),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockSecureStoreData.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockSecureStoreData.delete(key);
    return Promise.resolve();
  }),
  __clearStore: () => mockSecureStoreData.clear(),
}));

// -- expo-crypto --------------------------------------------------------------
jest.mock("expo-crypto", () => ({
  getRandomBytes: jest.fn((count: number) => {
    const arr = new Uint8Array(count);
    for (let i = 0; i < count; i++) arr[i] = (i * 7 + 13) % 256;
    return arr;
  }),
}));

// -- @react-native-async-storage/async-storage --------------------------------
const mockAsyncStoreData = new Map<string, string>();

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) =>
      Promise.resolve(mockAsyncStoreData.get(key) ?? null)
    ),
    setItem: jest.fn((key: string, value: string) => {
      mockAsyncStoreData.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      mockAsyncStoreData.delete(key);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      mockAsyncStoreData.clear();
      return Promise.resolve();
    }),
  },
}));

// -- expo-sqlite --------------------------------------------------------------
jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    runSync: jest.fn(),
    getAllSync: jest.fn(() => []),
  })),
}));

// -- Environment variables ----------------------------------------------------
process.env.EXPO_PUBLIC_NETWORK = "sepolia";
process.env.EXPO_PUBLIC_PRIVY_APP_ID = "test_privy_app_id";
process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test_supabase_key";

// -- Silence noisy warnings ---------------------------------------------------
const origWarn = console.warn;
console.warn = (...args: any[]) => {
  if (typeof args[0] === "string" && args[0].includes("Animated")) return;
  origWarn(...args);
};
