const { getDefaultConfig } = require("expo/metro-config");
const { withStarkzap } = require("starkzap-native/metro");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(withStarkzap(config), { input: "./global.css" });
