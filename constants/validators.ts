import { ENV } from "@/lib/env";

type ValidatorPreset = {
  name: string;
  stakerAddress: string;
  logoUrl: string | null;
};

// Lazy-loaded to avoid pulling the full starkzap module chain at startup.
let _cached: ValidatorPreset[] | null = null;

export function getCuratedValidators(): ValidatorPreset[] {
  if (_cached) return _cached;
  const { mainnetValidators, sepoliaValidators } = require("starkzap") as typeof import("starkzap");

  if (ENV.NETWORK === "mainnet") {
    _cached = [
      { name: "Karnot",         stakerAddress: mainnetValidators.KARNOT?.stakerAddress        ?? "0x0", logoUrl: null },
      { name: "AVNU",           stakerAddress: mainnetValidators.AVNU?.stakerAddress           ?? "0x0", logoUrl: null },
      { name: "Braavos",        stakerAddress: mainnetValidators.BRAAVOS?.stakerAddress        ?? "0x0", logoUrl: null },
      { name: "Nethermind",     stakerAddress: mainnetValidators.NETHERMIND?.stakerAddress     ?? "0x0", logoUrl: null },
      { name: "Simply Staking", stakerAddress: mainnetValidators.SIMPLY_STAKING?.stakerAddress ?? "0x0", logoUrl: null },
    ].filter((v) => v.stakerAddress !== "0x0");
  } else {
    _cached = Object.entries(sepoliaValidators)
      .slice(0, 5)
      .map(([name, v]) => ({
        name,
        stakerAddress: v.stakerAddress,
        logoUrl: null,
      }));
  }
  return _cached;
}
