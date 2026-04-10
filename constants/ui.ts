// constants/ui.ts

// ─── Colors ──────────────────────────────────────────────────────────────────

export const COLORS = {
  // Backgrounds
  background:    "#0D0D0D",
  surface:       "#141414",
  surfaceAlt:    "#1A1A1A",
  border:        "#222222",

  // Brand
  accent:        "#7B5EA7",
  accentDim:     "#4A3870",
  accentSubtle:  "#2A1F42",

  // Semantic
  success:       "#4CAF50",
  successSubtle: "#1A3B1C",
  error:         "#EF4444",
  errorSubtle:   "#3B1A1A",
  warning:       "#F59E0B",
  warningSubtle: "#3B2A0A",

  // Text
  textPrimary:   "#FFFFFF",
  textSecondary: "#A3A3A3",
  textTertiary:  "#737373",
  textMuted:     "#404040",

  // Amounts
  positive:      "#4ADE80",
  negative:      "#F87171",

  // Private / Tongo
  private:       "#C084FC",
  privateSubtle: "#3B1F5C",
} as const;

export type ColorKey = keyof typeof COLORS;

// ─── Typography ───────────────────────────────────────────────────────────────

export const FONTS = {
  regular:  "Inter-Regular",
  medium:   "Inter-Medium",
  semiBold: "Inter-SemiBold",
  bold:     "Inter-Bold",
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
  pageH: 24,
  pageT: 60,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 9999,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const SHADOWS = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

// ─── Tab Bar ─────────────────────────────────────────────────────────────────

export const TAB_BAR = {
  backgroundColor: COLORS.background,
  borderTopColor:  COLORS.border,
  activeTintColor: COLORS.accent,
  inactiveTintColor: COLORS.textMuted,
  height: 60,
} as const;
