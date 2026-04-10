# Category 1 — Foundation & Infrastructure (Detailed Plan)

> **Goal**: A scaffolded Expo project that boots to a blank screen with zero runtime errors, zero TypeScript errors, and all SDKs pre-installed & wired up for Category 2 to begin immediately.

---

## Context

- Current state of `/home/devair/Documents/SpiceUP/`: empty except for `PRD.md` and `.claude/`.
- Node.js available at `/home/devair/.nvm/versions/node/v22.22.0/bin/node` (v20 and v25 also present) — must be activated via `source ~/.nvm/nvm.sh && nvm use 22` in each new shell session since the system PATH doesn't include nvm binaries.
- This category has **no business logic** — it's purely "make the project boot". Every dependency from Categories 2–8 gets installed here so later categories don't need to touch infrastructure.

---

## 1. What We're Building (Deliverables)

A working Expo React Native TypeScript project with:

1. **Project scaffold** — Expo managed workflow, TypeScript strict mode
2. **All SDK dependencies installed** — starkzap-native, Privy, Supabase, polyfills
3. **Metro config** — wrapped with `withStarkzap()` for polyfill injection
4. **Babel config** — NativeWind + Reanimated plugins
5. **TypeScript config** — strict mode + `@/` path aliases
6. **Directory structure** — `app/`, `components/`, `lib/`, `hooks/`, `constants/`, `assets/`
7. **Environment scaffolding** — `.env`, `.env.example`, `.gitignore`
8. **Entry polyfills** — custom `index.ts` that loads Buffer/TextEncoder/crypto before anything else
9. **Placeholder root screen** — blank splash proving the bundle works end-to-end

Success = `npx expo start --clear` boots, web/mobile opens a blank screen, `npx tsc --noEmit` passes with 0 errors.

---

## 2. Tools Needed (Outside the Repo)

| Tool | Purpose | How to Get |
|---|---|---|
| Node.js 22 (LTS) | JS runtime for Expo | Already installed at `~/.nvm/versions/node/v22.22.0/` |
| nvm | Node version manager | Already installed at `~/.nvm/` |
| Git | Version control | Likely already installed (`git --version` to confirm) |
| Expo Go (iOS/Android) | Test on real device | App Store / Play Store (optional for web testing) |
| Watchman (optional) | Fast file watching for Metro | `sudo apt install watchman` (speeds up dev, not required) |
| A browser (Chrome/Firefox) | Test via `expo start` web mode | Already available |

---

## 3. Package Dependencies (Grouped by Purpose)

### 3.1 Core framework (provided by `create-expo-app` template)
- `expo` (SDK 51+)
- `react`, `react-native`
- `typescript`, `@types/react`

### 3.2 Routing — installed via `npx expo install`
- `expo-router`
- `expo-linking`
- `expo-constants`
- `expo-status-bar`
- `react-native-safe-area-context`
- `react-native-screens`

### 3.3 Starkzap SDK + required polyfills — installed via `npm install`
- `starkzap-native` — the RN build of Starkzap v2
- `react-native-get-random-values` — crypto.getRandomValues polyfill
- `fast-text-encoding` — TextEncoder/TextDecoder polyfill
- `buffer` — Node Buffer polyfill
- `@ethersproject/shims` — ethers.js RN compatibility shim

### 3.4 Auth — Privy for Expo
- `@privy-io/expo`

### 3.5 Storage & crypto — installed via `npx expo install`
- `expo-secure-store` — for Tongo private key storage
- `expo-crypto` — cryptographic utilities
- `expo-sqlite` — local cache for groups/expenses
- `@react-native-async-storage/async-storage` — simple KV store

### 3.6 State + backend
- `zustand` — state management
- `@supabase/supabase-js` — backend client

### 3.7 Styling
- `nativewind` — Tailwind for React Native
- `tailwindcss@3.4.0` — pin to v3 (v4 alpha has breaking changes)
- `react-native-reanimated` — animations (required by many RN UI libs)

### 3.8 Icons & QR
- `@expo/vector-icons` — icon set
- `react-native-qrcode-svg` — QR rendering for Category 3
- `expo-barcode-scanner` — QR scanning for Category 4

### 3.9 Dev tools (already in Expo template)
- `@babel/core`
- `@types/node` (add if missing)

---

## 4. Step-by-Step Build Sequence

### Step 4.1 — Activate Node
```bash
source ~/.nvm/nvm.sh
nvm use 22
node --version   # expect v22.x
npm --version
```

### Step 4.2 — Scaffold the Expo project
```bash
cd /home/devair/Documents/SpiceUP
npx create-expo-app@latest . --template blank-typescript --yes
```
Creates: `App.tsx`, `package.json`, `tsconfig.json`, `app.json`, `babel.config.js`, `assets/`, `.gitignore`.

**Note**: `PRD.md` already exists — `create-expo-app` should not overwrite it, but verify after scaffold.

### Step 4.3 — Install Expo Router + routing deps
```bash
npx expo install expo-router expo-linking expo-constants expo-status-bar react-native-safe-area-context react-native-screens
```

### Step 4.4 — Install Starkzap + polyfills
```bash
npm install starkzap-native react-native-get-random-values fast-text-encoding buffer @ethersproject/shims
```
> **Risk**: If `starkzap-native` isn't published on npm under this exact name, the install fails. Fallback: check the actual package name via `npm view starkzap-native` or `gh` on the docs repo, or install via git URL.

### Step 4.5 — Install auth, storage, state, backend
```bash
npm install @privy-io/expo zustand @supabase/supabase-js
npx expo install expo-secure-store expo-crypto expo-sqlite @react-native-async-storage/async-storage
```

### Step 4.6 — Install styling
```bash
npm install nativewind
npm install -D tailwindcss@3.4.0
npx expo install react-native-reanimated
```

### Step 4.7 — Install icons & QR
```bash
npx expo install @expo/vector-icons expo-barcode-scanner
npm install react-native-qrcode-svg react-native-svg
```

### Step 4.8 — Create directory structure
```bash
mkdir -p app components lib hooks constants
```

### Step 4.9 — Write/edit config files
(see Section 5 below for exact content)

1. Create `metro.config.js`
2. Replace `babel.config.js`
3. Update `tsconfig.json`
4. Update `app.json`
5. Create `tailwind.config.js`
6. Create `global.css`
7. Create `nativewind-env.d.ts`
8. Create `index.ts` (polyfill entry)
9. Update `package.json` `main` field
10. Create `.env` and `.env.example`
11. Update `.gitignore`

### Step 4.10 — Create placeholder screens
1. `app/_layout.tsx` — Stack layout that renders children
2. `app/index.tsx` — Blank screen with text "SpiceUP loading..."
3. Delete the default `App.tsx` (expo-router uses `app/` dir instead)

### Step 4.11 — Verify
```bash
npx expo-doctor
npx tsc --noEmit
npx expo start --clear
# press 'w' to open in web browser
```

---

## 5. Config File Contents (Exact)

### 5.1 `metro.config.js` (new)
```js
const { getDefaultConfig } = require("expo/metro-config");
const { withStarkzap } = require("starkzap-native/metro");

const config = getDefaultConfig(__dirname);
module.exports = withStarkzap(config);
```

### 5.2 `babel.config.js` (replace)
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      "react-native-reanimated/plugin", // MUST be last
    ],
  };
};
```

### 5.3 `tsconfig.json` (replace)
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/lib/*": ["./lib/*"],
      "@/components/*": ["./components/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/constants/*": ["./constants/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts",
    "nativewind-env.d.ts"
  ]
}
```

### 5.4 `app.json` (update fields)
```json
{
  "expo": {
    "name": "SpiceUP",
    "slug": "spiceup",
    "scheme": "spiceup",
    "version": "0.1.0",
    "orientation": "portrait",
    "userInterfaceStyle": "dark",
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-barcode-scanner",
        { "cameraPermission": "Allow SpiceUP to scan QR codes for payments." }
      ]
    ],
    "ios": {
      "bundleIdentifier": "com.spiceup.app",
      "supportsTablet": true
    },
    "android": {
      "package": "com.spiceup.app"
    },
    "web": {
      "bundler": "metro"
    }
  }
}
```

### 5.5 `tailwind.config.js` (new)
```js
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0D0D0D",
        accent: "#7B5EA7",
        success: "#4CAF50"
      }
    }
  },
  plugins: []
};
```

### 5.6 `global.css` (new)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 5.7 `nativewind-env.d.ts` (new)
```ts
/// <reference types="nativewind/types" />
```

### 5.8 `index.ts` (new — replaces App.tsx as entry)
```ts
// Polyfills MUST load before any app code
import "react-native-get-random-values";
import "@ethersproject/shims";
import "fast-text-encoding";
import { Buffer } from "buffer";
// @ts-ignore
global.Buffer = Buffer;

import "expo-router/entry";
```

### 5.9 `package.json` (update `main` field)
```json
"main": "index.ts"
```
Also add scripts:
```json
"scripts": {
  "start": "expo start",
  "typecheck": "tsc --noEmit",
  "lint": "expo lint",
  "doctor": "expo-doctor"
}
```

### 5.10 `.env` (new, gitignored)
```
EXPO_PUBLIC_NETWORK=sepolia
EXPO_PUBLIC_PRIVY_APP_ID=
EXPO_PUBLIC_AVNU_API_KEY=
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

### 5.11 `.env.example` (new, committed)
Same keys, placeholder values like `your_privy_app_id_here`.

### 5.12 `.gitignore` (append)
```
.env
.env.local
.expo/
```

### 5.13 `app/_layout.tsx` (new — placeholder)
```tsx
import { Stack } from "expo-router";
import "../global.css";

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### 5.14 `app/index.tsx` (new — placeholder)
```tsx
import { View, Text } from "react-native";

export default function Home() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-white text-xl">SpiceUP</Text>
    </View>
  );
}
```

Delete `App.tsx` after this (expo-router replaces it).

---

## 6. Final Directory Structure (After Category 1)

```
SpiceUP/
├── app/
│   ├── _layout.tsx          ← placeholder
│   └── index.tsx            ← placeholder blank screen
├── assets/                  ← Expo defaults (icon, splash)
├── components/              ← empty, ready for Cat 7
├── constants/               ← empty, ready for Cat 3
├── hooks/                   ← empty, ready for Cat 3
├── lib/                     ← empty, ready for Cat 3
├── .env                     ← gitignored
├── .env.example
├── .gitignore
├── app.json
├── babel.config.js
├── global.css
├── index.ts                 ← polyfill entry
├── metro.config.js
├── nativewind-env.d.ts
├── package.json
├── PRD.md                   ← already exists
├── CATEGORY_1_FOUNDATION.md ← this file
├── tailwind.config.js
└── tsconfig.json
```

---

## 7. Verification Checklist (How We Know Cat 1 Is Done)

Run these in order, all must pass:

```bash
# 1. Expo health check
npx expo-doctor
# Expect: no errors (warnings OK)

# 2. TypeScript strict check
npx tsc --noEmit
# Expect: 0 errors

# 3. Lint
npx expo lint
# Expect: no critical errors

# 4. Dev server boot
npx expo start --clear
# Expect: metro bundler starts, no polyfill errors in console

# 5. Open in web
# Press 'w' in the running expo terminal
# Expect: blank dark screen with "SpiceUP" text, no runtime errors

# 6. Import smoke test (optional)
# Add temporarily to app/index.tsx:
#   import { StarkZap } from "starkzap-native";
#   console.log("sdk loaded", typeof StarkZap);
# Reload — expect console log, no bundler errors
```

**Done criteria checklist**:
- [ ] `npx expo-doctor` passes
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npx expo start --clear` boots without bundler errors
- [ ] Blank screen renders in browser (web) showing "SpiceUP"
- [ ] `starkzap-native` module imports without runtime errors
- [ ] No `Buffer is not defined` / `TextEncoder is not defined` / `crypto.getRandomValues is not defined` errors

---

## 8. Common Pitfalls & Iteration Tips

### Pitfalls
1. **Reanimated plugin order** — `react-native-reanimated/plugin` MUST be the **last** item in babel plugins array. Wrong order = runtime crash.
2. **Metro cache** — If weird errors after config changes, always `npx expo start --clear`.
3. **Polyfill import order** — Polyfills in `index.ts` must execute before ANY other import. Do not reorder.
4. **NativeWind version** — Pin `tailwindcss@3.4.0`; v4 is alpha and has breaking API.
5. **Expo-managed package versions** — Always use `npx expo install` (not `npm install`) for expo-* and react-native-* packages. It pins to versions compatible with the current Expo SDK.
6. **tsconfig paths at runtime** — TypeScript path aliases resolve at type-check time only. If runtime imports break, add `babel-plugin-module-resolver` (unlikely needed with Expo Router).
7. **Privy Expo setup** — May need extra iOS entitlements or URL scheme config that app.json plugin should handle.
8. **starkzap-native npm availability** — Documented but not verified as published. First install attempt will confirm. Fallback: install from git URL or contact Starknet team.

### Iteration Tools
| Tool | Use |
|---|---|
| `npx expo-doctor` | One-shot project health check — catches version mismatches |
| `npx expo install --fix` | Auto-corrects dependency versions to match Expo SDK |
| `npx expo start --clear` | Clears metro cache — first thing to try on weird errors |
| `npx tsc --noEmit --watch` | Live type checking in a separate terminal |
| Expo Dev Tools (browser) | Logs, reload, debugger — opens automatically with `expo start` |
| `npm ls <package>` | Verify a package is actually installed and what version |
| `npm view <package>` | Check npm registry for package existence + latest version |

### Debugging Workflow
If `expo start` fails:
1. Read the first error line carefully — usually names the missing module or bad import.
2. Run `npx expo-doctor` — often catches the root cause.
3. Try `--clear` to rule out stale cache.
4. Check `node_modules` for the failing package (`npm ls <name>`).
5. Google the exact error + "expo sdk 51" (or current SDK).

---

## 9. Risks & Open Unknowns

| Risk | Impact | Mitigation |
|---|---|---|
| `starkzap-native` package name / availability on npm | **High** — blocks everything | First install will tell us; have git URL fallback ready; contact Starknet Discord if missing |
| Privy Expo SDK requires additional native config | Medium | Read Privy Expo docs after install, may need EAS dev build instead of Expo Go |
| `nativewind` + current Expo SDK version incompatibility | Medium | Pin tailwindcss@3.4.0, test early; fallback is plain StyleSheet |
| Reanimated version mismatch with Expo SDK | Low | `npx expo install react-native-reanimated` pins correctly |
| Expo Go vs dev build for native modules | Medium-High | Some Starkzap deps may need a dev build (`npx expo prebuild` + `eas build --profile development`); discover on first run |

---

## 10. What's NOT in Category 1

Deferred to later categories:
- Any actual SDK initialization code (→ Cat 3)
- Privy provider setup (→ Cat 2)
- Any screens beyond the blank placeholder (→ Cat 2+)
- Supabase schema & auth wiring (→ Cat 2 for auth, Cat 5 for tables)
- Business logic, stores, hooks (→ Cat 3+)
- Unit tests (→ Cat 8)
- EAS Build / production config (→ Cat 8)

Category 1 is purely "make the project boot". When done, opening the app shows a blank dark screen and nothing crashes.
