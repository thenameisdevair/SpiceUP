// Polyfills MUST load before any app code
import "react-native-get-random-values";
import "@ethersproject/shims";
import "fast-text-encoding";
import { Buffer } from "buffer";
// @ts-ignore
global.Buffer = Buffer;

import "expo-router/entry";
