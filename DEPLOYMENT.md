# SpiceUP Deployment PRD

## Overview

SpiceUP is a managed Expo (SDK 55) React Native app with custom native modules that prevent use of Expo Go. All builds must go through EAS Build to compile native code. This document defines platform-specific deployment strategies for Android and iOS.

## Why EAS Build Is Required

The following native modules are not bundled in Expo Go:

| Module | iOS | Android | Purpose |
|--------|-----|---------|---------|
| react-native-passkeys | min iOS 15.0 | min SDK 21 | WebAuthn biometric auth |
| @privy-io/expo-native-extensions | min iOS 13.4 | min SDK 21 | Privy auth native layer |
| expo-camera | min iOS 15.1 | managed | QR code scanning |
| expo-secure-store | min iOS 15.1 | managed | Encrypted key storage |
| expo-sqlite | min iOS 15.1 | managed | Local database |
| react-native-reanimated | min iOS 13.4 | min SDK 23 | Animations |
| react-native-svg | min iOS 12.4 | min SDK 16 | SVG rendering |
| react-native-webview | min iOS 9.0 | managed | WebView |

## Platform Targets

### Android
- **Minimum SDK:** 23 (Android 6.0 Marshmallow) — set by react-native-reanimated
- **Target SDK:** 35 (Android 15)
- **Compile SDK:** 35
- **Distribution:** APK for dev/preview, AAB for Google Play production

### iOS
- **Deployment Target:** 15.1 — set by expo-camera, expo-secure-store, expo-sqlite
- **Supported Devices:** iPhone 11 and newer (all support iOS 15.1+)
- **Distribution:** Internal (ad-hoc) for dev/preview, TestFlight/App Store for production
- **Requirement:** Apple Developer Program ($99/year) for any iOS distribution

### iPhone Compatibility Matrix

| Device | Released | Max iOS | Supports 15.1+ |
|--------|----------|---------|-----------------|
| iPhone 11 | 2019 | iOS 18+ | Yes |
| iPhone 11 Pro | 2019 | iOS 18+ | Yes |
| iPhone 12 series | 2020 | iOS 18+ | Yes |
| iPhone 13 series | 2021 | iOS 18+ | Yes |
| iPhone 14 series | 2022 | Current | Yes |
| iPhone 15 series | 2023 | Current | Yes |
| iPhone 16 series | 2024 | Current | Yes |

iPhone X and earlier: NOT SUPPORTED (cannot run iOS 15.1)

## Build Profiles

### 1. Development (dev builds)

**Purpose:** Day-to-day development with hot reload, dev menu, inspector.

| Setting | Android | iOS |
|---------|---------|-----|
| Build type | APK (direct install) | Development client |
| Distribution | Internal (direct download) | Internal (ad-hoc, requires UDID) |
| Network | Sepolia testnet | Sepolia testnet |
| Signing | Debug keystore (auto) | Ad-hoc provisioning (requires Apple Dev) |

**Android command:**
```bash
eas build --profile development --platform android
```
Produces an APK. Download and install directly — no account needed.

**iOS command:**
```bash
eas build --profile development --platform ios
```
Requires Apple Developer account. Devices must be registered via `eas device:create`.

### 2. Preview (internal testing)

**Purpose:** Test production-like builds before release. No dev tools.

| Setting | Android | iOS |
|---------|---------|-----|
| Build type | APK | Archive (.ipa) |
| Distribution | Internal | Internal (ad-hoc) |
| Network | Sepolia testnet | Sepolia testnet |
| OTA Updates | Yes (preview channel) | Yes (preview channel) |

**Command (both):**
```bash
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

### 3. Production (release)

**Purpose:** Store submission.

| Setting | Android | iOS |
|---------|---------|-----|
| Build type | AAB (Google Play) | Archive (.ipa) |
| Distribution | Store | Store (TestFlight → App Store) |
| Network | Mainnet | Mainnet |
| OTA Updates | Yes (production channel) | Yes (production channel) |
| Version | Auto-increment | Auto-increment |

**Android submission:**
```bash
eas build --profile production --platform android
eas submit --platform android
```
Requires Google Play Console account + service account key.

**iOS submission:**
```bash
eas build --profile production --platform ios
eas submit --platform ios
```
Requires Apple Developer account + App Store Connect setup.

## Auto-Detection

EAS automatically detects the target platform via the `--platform` flag. Within eas.json, platform-specific overrides use `ios` and `android` keys inside each build profile. No app-code changes are needed — Expo modules handle runtime platform detection internally (Keychain vs Keystore, etc.).

To build both platforms in one command:
```bash
eas build --profile development --platform all
```

## Configuration Changes Required

### expo-build-properties plugin
Sets native build targets (iOS deployment target, Android SDK versions). Must be installed and added to app.json plugins.

### app.json updates
- Fix `updates.url` with real EAS project ID
- Add `expo-build-properties` plugin with platform targets

### eas.json updates
- Remove iOS simulator-only restriction from development profile
- Add Android APK build type for development
- Keep preview and production profiles as-is

## Cost Summary

| Platform | Development | Store Release |
|----------|-------------|---------------|
| Android | Free (APK sideload) | $25 one-time (Google Play) |
| iOS | $99/year (Apple Developer) | Same $99/year |

## Quick Start (Android — Free)

```bash
# One-time setup
npm install -g eas-cli
eas login
eas init

# Build dev client
eas build --profile development --platform android

# Install APK on phone, then:
npx expo start
```
