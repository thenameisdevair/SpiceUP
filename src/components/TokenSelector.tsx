"use client";

import { cn } from "@/lib/utils";
import { TOKEN_BY_SYMBOL } from "@/constants/tokens";

interface TokenSelectorProps {
  /** Currently selected token symbol */
  selected: string;
  /** Token selection handler */
  onSelect: (symbol: string) => void;
  /** Disabled state */
  disabled?: boolean;
}

const TOKEN_SYMBOLS = ["ETH", "STRK", "USDC"] as const;

/** Token color mapping for the selector chips */
const TOKEN_COLORS: Record<string, string> = {
  ETH: "bg-blue-500/15 border-blue-500/30 text-blue-400",
  STRK: "bg-purple-500/15 border-purple-500/30 text-purple-400",
  USDC: "bg-green-500/15 border-green-500/30 text-green-400",
};

const TOKEN_COLORS_ACTIVE: Record<string, string> = {
  ETH: "bg-blue-500/25 border-blue-500/50 text-blue-300",
  STRK: "bg-purple-500/25 border-purple-500/50 text-purple-300",
  USDC: "bg-green-500/25 border-green-500/50 text-green-300",
};

export function TokenSelector({
  selected,
  onSelect,
  disabled = false,
}: TokenSelectorProps) {
  return (
    <div className="flex gap-2">
      {TOKEN_SYMBOLS.map((symbol) => {
        const config = TOKEN_BY_SYMBOL[symbol];
        const isActive = selected === symbol;

        return (
          <button
            key={symbol}
            onClick={() => onSelect(symbol)}
            disabled={disabled}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
              isActive
                ? TOKEN_COLORS_ACTIVE[symbol]
                : TOKEN_COLORS[symbol],
              disabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:opacity-80 cursor-pointer"
            )}
          >
            <span className="text-xs">{config.icon}</span>
            <span>{symbol}</span>
          </button>
        );
      })}
    </div>
  );
}
