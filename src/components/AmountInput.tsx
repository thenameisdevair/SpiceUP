"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import { TokenSelector } from "@/components/TokenSelector";
import { Button } from "@/components/ui/Button";

interface AmountInputProps {
  /** Currently selected token */
  token: string;
  /** Token change handler */
  onTokenChange: (token: string) => void;
  /** Amount value */
  amount: string;
  /** Amount change handler */
  onAmountChange: (amount: string) => void;
  /** Max balance for the selected token */
  maxBalance?: string;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
}

export function AmountInput({
  token,
  onTokenChange,
  amount,
  onAmountChange,
  maxBalance,
  error,
  disabled = false,
}: AmountInputProps) {
  const [focused, setFocused] = useState(false);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      // Allow only numbers and up to one decimal point
      val = val.replace(/[^0-9.]/g, "");
      // Prevent multiple decimal points
      const parts = val.split(".");
      if (parts.length > 2) {
        val = parts[0] + "." + parts.slice(1).join("");
      }
      // Limit decimal places to 6
      if (parts.length === 2 && parts[1].length > 6) {
        val = parts[0] + "." + parts[1].slice(0, 6);
      }
      onAmountChange(val);
    },
    [onAmountChange]
  );

  const handleMax = useCallback(() => {
    if (maxBalance) {
      onAmountChange(maxBalance);
    }
  }, [maxBalance, onAmountChange]);

  return (
    <div className="space-y-2">
      {/* Token selector */}
      <TokenSelector selected={token} onSelect={onTokenChange} />

      {/* Amount input */}
      <div
        className={`bg-spiceup-surface border rounded-xl transition-all ${
          focused
            ? "border-spiceup-accent ring-1 ring-spiceup-accent/30"
            : error
            ? "border-red-500"
            : "border-spiceup-border"
        }`}
      >
        <div className="flex items-center px-4">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            className="flex-1 bg-transparent text-white text-2xl font-bold py-3.5 outline-none placeholder:text-spiceup-text-muted disabled:opacity-50"
          />
          {maxBalance && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMax}
              disabled={disabled}
              className="text-spiceup-accent text-xs font-semibold px-2 py-1"
            >
              MAX
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}

      {/* Subtle USD hint */}
      {amount && parseFloat(amount) > 0 && (
        <p className="text-spiceup-text-muted text-xs">
          ≈ ${"—"} USD
        </p>
      )}
    </div>
  );
}
