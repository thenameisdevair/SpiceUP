import "server-only";

import { type PrivyClient } from "@privy-io/node";
import {
  Account,
  CallData,
  CairoCustomEnum,
  CairoOption,
  CairoOptionVariant,
  RpcProvider,
  SignerInterface,
  cairo,
  hash,
  typedData,
  uint256,
  validateAndParseAddress,
  type Call,
  type DeclareSignerDetails,
  type DeployAccountSignerDetails,
  type InvocationsSignerDetails,
  type Signature,
  type TypedData,
} from "starknet";
import { getNetwork } from "@/constants/network";
import { TOKEN_BY_SYMBOL, type TokenConfig } from "@/constants/tokens";
import { formatBalance } from "@/lib/format";
import { ApiAuthError } from "@/lib/server-auth";
import { getAvnuApiKey, getAvnuPaymasterBaseUrl } from "@/lib/server-avnu";

type PrivyStarknetWallet = {
  id: string;
  address: string;
  public_key?: string | null;
};

const READY_ACCOUNT_CLASS_HASH_V0_5_0 =
  "0x073414441639dcd11d1846f287650a00c60c416b9d3ba45d31c651672125b2c2";

export const SUPPORTED_TOKEN_SYMBOLS = ["ETH", "STRK", "USDC"] as const;
export type SupportedTokenSymbol = (typeof SUPPORTED_TOKEN_SYMBOLS)[number];

export interface LiveTokenBalance {
  symbol: SupportedTokenSymbol;
  amount: string;
  decimals: number;
  formatted: string;
}

let providerSingleton: RpcProvider | null = null;

function getNormalizedPublicKey(publicKey: string | null | undefined) {
  if (!publicKey) {
    throw new ApiAuthError(
      500,
      "The linked Starknet wallet is missing a public key in Privy."
    );
  }

  return publicKey.startsWith("0x") ? publicKey : `0x${publicKey}`;
}

function getTokenConfig(symbol: SupportedTokenSymbol): TokenConfig {
  return TOKEN_BY_SYMBOL[symbol];
}

function getTokenUnit(decimals: number) {
  return BigInt(10) ** BigInt(decimals);
}

export function parseTokenAmount(amount: string, decimals: number) {
  const trimmed = amount.trim();

  if (!trimmed) {
    throw new ApiAuthError(400, "Enter an amount to send.");
  }

  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
    throw new ApiAuthError(400, "Amount must be a valid number.");
  }

  const [wholePartRaw, fractionalPartRaw = ""] = trimmed.split(".");
  const wholePart = wholePartRaw === "" ? "0" : wholePartRaw;

  if (fractionalPartRaw.length > decimals) {
    throw new ApiAuthError(
      400,
      `This token supports up to ${decimals} decimal places.`
    );
  }

  const normalized = `${wholePart}${fractionalPartRaw.padEnd(decimals, "0")}`
    .replace(/^0+(?=\d)/, "");
  const baseUnits = BigInt(normalized || "0");

  if (baseUnits <= 0n) {
    throw new ApiAuthError(400, "Amount must be greater than zero.");
  }

  return baseUnits;
}

export function formatTokenAmount(amount: bigint, decimals: number) {
  const divisor = getTokenUnit(decimals);
  const whole = amount / divisor;
  const fractional = amount % divisor;

  if (fractional === 0n) {
    return whole.toString();
  }

  const fractionalString = fractional
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");

  return `${whole}.${fractionalString}`;
}

export function getStarknetProvider() {
  if (!providerSingleton) {
    const rpcUrl = getNetwork().rpcUrl.trim();

    if (!rpcUrl) {
      throw new ApiAuthError(
        500,
        "A Starknet RPC URL is missing. Set NEXT_PUBLIC_RPC_URL_SEPOLIA or NEXT_PUBLIC_RPC_URL_MAINNET in your deployment environment."
      );
    }

    providerSingleton = new RpcProvider({
      nodeUrl: rpcUrl,
    });
  }

  return providerSingleton;
}

function getReadyAccountData(wallet: PrivyStarknetWallet) {
  const publicKey = getNormalizedPublicKey(wallet.public_key);
  const owner = new CairoCustomEnum({ Starknet: { pubkey: publicKey } });
  const guardian = new CairoOption<unknown>(CairoOptionVariant.None);
  const constructorCalldata = CallData.compile({
    owner,
    guardian,
  });
  const expectedAddress = validateAndParseAddress(
    hash.calculateContractAddressFromHash(
      publicKey,
      READY_ACCOUNT_CLASS_HASH_V0_5_0,
      constructorCalldata,
      0
    )
  );
  const walletAddress = validateAndParseAddress(wallet.address);

  if (expectedAddress !== walletAddress) {
    throw new ApiAuthError(
      500,
      "The Starknet wallet returned by Privy does not match the account template expected by this build."
    );
  }

  return {
    address: walletAddress,
    publicKey,
    deploymentData: {
      address: walletAddress,
      class_hash: READY_ACCOUNT_CLASS_HASH_V0_5_0,
      salt: publicKey,
      calldata: constructorCalldata,
      version: 1 as const,
    },
  };
}

function isNotDeployedError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes("contract not found") ||
    message.includes("class hash not found") ||
    message.includes("not deployed")
  );
}

class PrivyStarknetSigner extends SignerInterface {
  constructor(
    private readonly client: PrivyClient,
    private readonly walletId: string,
    private readonly publicKey: string,
    private readonly accessToken: string
  ) {
    super();
  }

  async getPubKey() {
    return this.publicKey;
  }

  async signMessage(typedDataValue: TypedData, accountAddress: string) {
    const messageHash = typedData.getMessageHash(typedDataValue, accountAddress);
    return this.signRawHash(messageHash);
  }

  async signTransaction(
    _transactions: Call[],
    _details: InvocationsSignerDetails
  ) {
    throw new Error(
      "Privy Starknet signing is currently configured for sponsored message-based execution only."
    );
  }

  async signDeployAccountTransaction(_details: DeployAccountSignerDetails) {
    throw new Error(
      "Privy Starknet signing is currently configured for sponsored message-based execution only."
    );
  }

  async signDeclareTransaction(_details: DeclareSignerDetails) {
    throw new Error(
      "Privy Starknet signing is currently configured for sponsored message-based execution only."
    );
  }

  private async signRawHash(messageHash: string): Promise<Signature> {
    const response = await this.client.wallets().rawSign(this.walletId, {
      params: { hash: messageHash },
      authorization_context: {
        user_jwts: [this.accessToken],
      },
    });
    const rawSignature = response.signature.startsWith("0x")
      ? response.signature.slice(2)
      : response.signature;

    if (rawSignature.length !== 128) {
      throw new ApiAuthError(
        500,
        "Privy returned an unexpected Starknet signature format."
      );
    }

    return [
      `0x${rawSignature.slice(0, 64)}`,
      `0x${rawSignature.slice(64)}`,
    ] as Signature;
  }
}

export async function getLiveTokenBalance(
  address: string,
  symbol: SupportedTokenSymbol
): Promise<LiveTokenBalance> {
  const normalizedAddress = validateAndParseAddress(address);
  const token = getTokenConfig(symbol);
  const provider = getStarknetProvider();
  const rawBalance = await provider.callContract({
    contractAddress: token.address,
    entrypoint: "balanceOf",
    calldata: CallData.compile([normalizedAddress]),
  });

  if (rawBalance.length < 2) {
    throw new ApiAuthError(
      500,
      `Could not read the ${symbol} balance from Starknet.`
    );
  }

  const balance = uint256.uint256ToBN({
    low: rawBalance[0],
    high: rawBalance[1],
  });
  const amount = formatTokenAmount(balance, token.decimals);

  return {
    symbol,
    amount,
    decimals: token.decimals,
    formatted: formatBalance(amount),
  };
}

export async function getAllLiveTokenBalances(address: string) {
  const balances = await Promise.all(
    SUPPORTED_TOKEN_SYMBOLS.map(async (symbol) => [
      symbol,
      await getLiveTokenBalance(address, symbol),
    ] as const)
  );

  return Object.fromEntries(balances) as Record<SupportedTokenSymbol, LiveTokenBalance>;
}

export async function getLiveTokenBalanceRaw(
  address: string,
  symbol: SupportedTokenSymbol
) {
  const normalizedAddress = validateAndParseAddress(address);
  const token = getTokenConfig(symbol);
  const provider = getStarknetProvider();
  const rawBalance = await provider.callContract({
    contractAddress: token.address,
    entrypoint: "balanceOf",
    calldata: CallData.compile([normalizedAddress]),
  });

  if (rawBalance.length < 2) {
    throw new ApiAuthError(
      500,
      `Could not read the ${symbol} balance from Starknet.`
    );
  }

  return uint256.uint256ToBN({
    low: rawBalance[0],
    high: rawBalance[1],
  });
}

export async function isStarknetAccountDeployed(address: string) {
  const provider = getStarknetProvider();

  try {
    await provider.getClassHashAt(address);
    return true;
  } catch (error) {
    if (isNotDeployedError(error)) {
      return false;
    }

    throw error;
  }
}

function createSponsoredAccount(params: {
  client: PrivyClient;
  wallet: PrivyStarknetWallet;
  accessToken: string;
}) {
  const apiKey = getAvnuApiKey();

  if (!apiKey) {
    throw new ApiAuthError(
      500,
      "AVNU_API_KEY is missing on the server, so sponsored Starknet sends cannot run."
    );
  }

  const { client, wallet, accessToken } = params;
  const accountData = getReadyAccountData(wallet);
  const provider = getStarknetProvider();
  const network = getNetwork();

  return new Account({
    provider,
    address: accountData.address,
    signer: new PrivyStarknetSigner(
      client,
      wallet.id,
      accountData.publicKey,
      accessToken
    ),
    paymaster: {
      nodeUrl: getAvnuPaymasterBaseUrl(network.name),
      headers: {
        "x-paymaster-api-key": apiKey,
      },
    },
  });
}

export function buildTokenTransferCall(params: {
  token: SupportedTokenSymbol;
  recipient: string;
  amount: bigint;
}) {
  const token = getTokenConfig(params.token);
  const recipient = validateAndParseAddress(params.recipient);

  return {
    contractAddress: token.address,
    entrypoint: "transfer",
    calldata: CallData.compile([recipient, cairo.uint256(params.amount)]),
  } satisfies Call;
}

export async function sendSponsoredTokenTransfer(params: {
  client: PrivyClient;
  wallet: PrivyStarknetWallet;
  accessToken: string;
  token: SupportedTokenSymbol;
  recipient: string;
  amount: bigint;
}) {
  const { client, wallet, accessToken, token, recipient, amount } = params;
  const provider = getStarknetProvider();
  const account = createSponsoredAccount({
    client,
    wallet,
    accessToken,
  });
  const accountData = getReadyAccountData(wallet);
  let deploymentTxHash: string | null = null;
  const deployed = await isStarknetAccountDeployed(account.address);

  if (!deployed) {
    const deploymentResult = await account.executePaymasterTransaction([], {
      feeMode: { mode: "sponsored" },
      deploymentData: accountData.deploymentData,
    });

    deploymentTxHash = deploymentResult.transaction_hash;
    await provider.waitForTransaction(deploymentTxHash);
  }

  const transferResult = await account.executePaymasterTransaction(
    [buildTokenTransferCall({ token, recipient, amount })],
    {
      feeMode: { mode: "sponsored" },
    }
  );

  await provider.waitForTransaction(transferResult.transaction_hash);

  return {
    deploymentTxHash,
    txHash: transferResult.transaction_hash,
  };
}
