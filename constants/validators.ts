import { mainnetValidators, sepoliaValidators } from "starkzap";
import { ENV } from "@/lib/env";

type ValidatorPreset = {
  name: string;
  stakerAddress: string;
  logoUrl: string | null;
};

const MAINNET_CURATED: ValidatorPreset[] = [
  { name: "Karnot",         stakerAddress: mainnetValidators.KARNOT?.stakerAddress        ?? "0x0", logoUrl: null },
  { name: "AVNU",           stakerAddress: mainnetValidators.AVNU?.stakerAddress           ?? "0x0", logoUrl: null },
  { name: "Braavos",        stakerAddress: mainnetValidators.BRAAVOS?.stakerAddress        ?? "0x0", logoUrl: null },
  { name: "Nethermind",     stakerAddress: mainnetValidators.NETHERMIND?.stakerAddress     ?? "0x0", logoUrl: null },
  { name: "Simply Staking", stakerAddress: mainnetValidators.SIMPLY_STAKING?.stakerAddress ?? "0x0", logoUrl: null },
].filter((v) => v.stakerAddress !== "0x0");

const SEPOLIA_CURATED: ValidatorPreset[] = Object.entries(sepoliaValidators)
  .slice(0, 5)
  .map(([name, v]) => ({
    name,
    stakerAddress: v.stakerAddress,
    logoUrl: null,
  }));

export const CURATED_VALIDATORS: ValidatorPreset[] =
  ENV.NETWORK === "mainnet" ? MAINNET_CURATED : SEPOLIA_CURATED;
