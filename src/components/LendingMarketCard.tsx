"use client";

import { motion } from "framer-motion";
import { Landmark, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatBalance } from "@/lib/format";
import type { AppLendingMarket, AppLendingPosition } from "@/lib/earn";

interface LendingMarketCardProps {
  market: AppLendingMarket;
  position?: AppLendingPosition;
  index?: number;
  onDeposit?: (market: AppLendingMarket) => void;
  onWithdraw?: (market: AppLendingMarket, position: AppLendingPosition) => void;
}

export function LendingMarketCard({
  market,
  position,
  index = 0,
  onDeposit,
  onWithdraw,
}: LendingMarketCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card padding="md" className="space-y-4">
        {/* Header: Pool name + APY */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-spiceup-success/15 border border-spiceup-success/25 flex items-center justify-center">
              <Landmark size={18} className="text-spiceup-success" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{market.poolName}</p>
              <p className="text-spiceup-text-muted text-xs">
                {formatBalance(market.totalDeposited)} {market.token} total
              </p>
            </div>
          </div>
          <Badge variant="success" size="md">
            {market.apyPercent}% APY
          </Badge>
        </div>

        {/* User position (if deposited) */}
        {position && (
          <div className="bg-spiceup-bg/50 border border-spiceup-border/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-spiceup-text-muted text-xs">Deposited</span>
              <span className="text-white text-sm font-medium">
                {formatBalance(position.depositedAmount)} {position.token}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-spiceup-text-muted text-xs">Est. yearly</span>
              <span className="text-spiceup-success text-sm font-medium">
                +
                {(
                  parseFloat(position.depositedAmount) *
                  (position.apyPercent / 100)
                ).toFixed(2)}{" "}
                {position.token}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => onDeposit?.(market)}
          >
            <ArrowDownToLine size={14} />
            Deposit
          </Button>
          {position && onWithdraw && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => onWithdraw(market, position)}
            >
              <ArrowUpFromLine size={14} />
              Withdraw
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
