/**
 * SpiceUP Design System UI Tokens
 * Colors, spacing, radii, and other design constants
 */

export const colors = {
  bg: "#0D0D0D",
  surface: "#141414",
  border: "#222222",
  accent: "#7B5EA7",
  accentHover: "#6B4E97",
  success: "#4CAF50",
  warning: "#FF9800",
  error: "#EF4444",
  text: {
    primary: "#FFFFFF",
    secondary: "#A0A0A0",
    muted: "#666666",
  },
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
} as const;

export const radius = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  full: "9999px",
} as const;

export const fonts = {
  sans: "Inter, system-ui, sans-serif",
  mono: "monospace",
} as const;

/** Gradient presets */
export const gradients = {
  accent: "linear-gradient(135deg, #7B5EA7 0%, #9B7EC7 100%)",
  success: "linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)",
  dark: "linear-gradient(180deg, #0D0D0D 0%, #1A1A1A 100%)",
} as const;
