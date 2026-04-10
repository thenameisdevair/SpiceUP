// components/QRScanner.tsx
import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import { CameraView, Camera } from "expo-camera";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "@/constants/ui";

export type ScannedAddressType = "starknet" | "tongo" | "unknown";

export interface ScanResult {
  type: ScannedAddressType;
  value: string;
}

interface Props {
  onScan: (result: ScanResult) => void;
  onClose: () => void;
}

function parseAddress(raw: string): ScanResult {
  const trimmed = raw.trim();
  if (/^0x[0-9a-fA-F]{63,64}$/.test(trimmed)) {
    return { type: "starknet", value: trimmed };
  }
  if (/^[1-9A-HJ-NP-Za-km-z]{40,60}$/.test(trimmed)) {
    return { type: "tongo", value: trimmed };
  }
  return { type: "unknown", value: trimmed };
}

const FRAME_SIZE = Math.min(Dimensions.get("window").width * 0.65, 260);

export function QRScanner({ onScan, onClose }: Props) {
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const borderOpacity = useSharedValue(1);
  useEffect(() => {
    borderOpacity.value = withRepeat(
      withTiming(0.3, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const frameStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={48} color={COLORS.textTertiary} />
        <Text style={styles.permissionText}>Camera access is required to scan QR codes.</Text>
        <Pressable onPress={requestPermission} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Enable Camera</Text>
        </Pressable>
      </View>
    );
  }

  function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    const result = parseAddress(data);
    onScan(result);
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      {/* Dark overlay with cutout */}
      <View style={styles.overlay}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={28} color={COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.topTitle}>Scan QR Code</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.cutoutRow}>
          <View style={styles.sideOverlay} />

          {/* Scan frame */}
          <View style={{ width: FRAME_SIZE, height: FRAME_SIZE }}>
            {(["tl", "tr", "bl", "br"] as const).map((corner) => (
              <View key={corner} style={[styles.corner, styles[corner]]} />
            ))}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { borderWidth: 2, borderColor: COLORS.accent, borderRadius: RADIUS.md },
                frameStyle,
              ]}
            />
          </View>

          <View style={styles.sideOverlay} />
        </View>

        <View style={styles.bottomOverlay}>
          <Text style={styles.hint}>
            Point at a Starknet address or SpiceUP private address
          </Text>
          {scanned && (
            <Pressable onPress={() => setScanned(false)} style={styles.rescanButton}>
              <Text style={styles.rescanText}>Tap to scan again</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const OVERLAY_BG = "rgba(0,0,0,0.65)";
const CORNER_SIZE = 20;
const CORNER_THICKNESS = 3;
const CORNER_COLOR = COLORS.accent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "column",
  },
  topBar: {
    backgroundColor: OVERLAY_BG,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.lg,
  },
  topTitle: {
    color: COLORS.textPrimary,
    fontFamily: "Inter-SemiBold",
    fontSize: 17,
  },
  cutoutRow: {
    flexDirection: "row",
    flex: 1,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: OVERLAY_BG,
  },
  bottomOverlay: {
    backgroundColor: OVERLAY_BG,
    alignItems: "center",
    paddingTop: SPACING.xl,
    paddingBottom: 60,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  hint: {
    color: COLORS.textSecondary,
    fontFamily: "Inter-Regular",
    fontSize: 13,
    textAlign: "center",
  },
  rescanButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  rescanText: {
    color: COLORS.textPrimary,
    fontFamily: "Inter-SemiBold",
    fontSize: 14,
  },
  permissionText: {
    color: COLORS.textSecondary,
    fontFamily: "Inter-Regular",
    fontSize: 14,
    textAlign: "center",
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.xxl,
  },
  permissionButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
  },
  permissionButtonText: {
    color: COLORS.textPrimary,
    fontFamily: "Inter-SemiBold",
    fontSize: 15,
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: CORNER_COLOR,
    borderWidth: 0,
  },
  tl: {
    top: 0, left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: RADIUS.sm,
  },
  tr: {
    top: 0, right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: RADIUS.sm,
  },
  bl: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: RADIUS.sm,
  },
  br: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: RADIUS.sm,
  },
});
