"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

interface AddressDisplayProps {
  /** The full address string */
  address: string;
  /** How many chars to show before the ellipsis (default 6) */
  chars?: number;
  /** Show copy button (default true) */
  showCopy?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function AddressDisplay({
  address,
  chars = 6,
  showCopy = true,
  className = "",
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  const shorten = (addr: string) => {
    if (!addr || addr.length <= chars * 2 + 2) return addr ?? "—";
    return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
  };

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  }, [address]);

  if (!address) {
    return (
      <span className={`text-spiceup-text-muted font-mono ${className}`}>
        —
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="font-mono text-sm text-white">{shorten(address)}</span>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="text-spiceup-text-muted hover:text-spiceup-accent transition-colors"
          aria-label="Copy address"
        >
          {copied ? (
            <Check size={14} className="text-spiceup-success" />
          ) : (
            <Copy size={14} />
          )}
        </button>
      )}
    </span>
  );
}
