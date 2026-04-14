import "server-only";

type StarknetNetwork = "sepolia" | "mainnet";

const PAYMASTER_BASE_URLS: Record<StarknetNetwork, string> = {
  sepolia: "https://sepolia.paymaster.avnu.fi",
  mainnet: "https://starknet.paymaster.avnu.fi",
};

export function getAvnuApiKey() {
  const apiKey = process.env.AVNU_API_KEY?.trim();
  return apiKey ? apiKey : null;
}

export function getAvnuPaymasterBaseUrl(network: StarknetNetwork) {
  return PAYMASTER_BASE_URLS[network];
}
