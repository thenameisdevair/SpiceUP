const { getDefaultConfig } = require("expo/metro-config");
const { withStarkzap } = require("starkzap-native/metro");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Apply starkzap's ESM/CJS interop resolver first.
const starkzapConfig = withStarkzap(config);

// Stub optional bridge/cross-chain deps that starkzap dynamically imports but this app
// never uses (Privy-only, no Solana bridging, no Cartridge, no Hyperlane).
// Must run AFTER withStarkzap so our stubs intercept before starkzap's resolver tries
// to resolve packages that aren't installed.
const STUB_MODULES = new Set([
  "@solana/web3.js",
  "@cartridge/controller",
  "ethers",
  "@hyperlane-xyz/sdk",
  "@hyperlane-xyz/registry",
  "@hyperlane-xyz/utils",
]);

const prevResolver = starkzapConfig.resolver.resolveRequest;
starkzapConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (STUB_MODULES.has(moduleName)) {
    return { type: "empty" };
  }
  return prevResolver(context, moduleName, platform);
};

module.exports = withNativeWind(starkzapConfig, { input: "./global.css" });
