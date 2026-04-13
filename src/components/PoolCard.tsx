"use client";

import { motion } from "framer-motion";
import { Shield, Gift, Clock, Zap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatBalance } from "@/lib/format";
import type { StakerPool, StakedPosition } from "@/lib/earn";

interface PoolCardProps {
  pool: StakerPool;
  position?: StakedPosition;
  index?: number;
  onStake?: (pool: StakerPool) => void;
  onClaim?: (pool: StakerPool, position: StakedPosition) => void;
  onUnstake?: (pool: StakerPool, position: StakedPosition) => void;
}

export function PoolCard({
  pool,
  position,
  index = 0,
  onStake,
  onClaim,
  onUnstake,
}: PoolCardProps) {
  const hasRewards = position && parseFloat(position.rewards) > 0;
  const isUnpooling = position?.unpooling;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card padding="md" className="space-y-4">
        {/* Header: Validator name + APY */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-spiceup-accent/15 border border-spiceup-accent/25 flex items-center justify-center">
              <Shield size={18} className="text-spiceup-accent" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">
                {pool.validatorName}
              </p>
              <p className="text-spiceup-text-muted text-xs">
                {formatBalance(pool.totalDelegated)} STRK delegated
              </p>
            </div>
          </div>
          {pool.apyPercent !== null ? (
            <Badge variant="success" size="md">
              {pool.apyPercent}% APY
            </Badge>
          ) : (
            <Badge variant="default" size="md">
              — APY
            </Badge>
          )}
        </div>

        {/* Commission */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-spiceup-text-muted">Commission</span>
          <span className="text-spiceup-text-secondary">{pool.commission}%</span>
        </div>

        {/* User position (if staked) */}
        {position && (
          <div className="bg-spiceup-bg/50 border border-spiceup-border/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-spiceup-text-muted text-xs">Your Stake</span>
              <span className="text-white text-sm font-medium">
                {formatBalance(position.staked)} STRK
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-spiceup-text-muted text-xs">Rewards</span>
              <span
                className={`text-sm font-medium ${
                  hasRewards ? "text-spiceup-success" : "text-spiceup-text-muted"
                }`}
              >
                {formatBalance(position.rewards)} STRK
              </span>
            </div>
            {isUnpooling && (
              <div className="flex items-center gap-1 text-spiceup-warning text-xs">
                <Clock size={12} />
                <span>Unpooling in progress...</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!position && onStake && (
            <Button
              variant="primary"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => onStake(pool)}
            >
              <Zap size={14} />
              Stake
            </Button>
          )}
          {position && !isUnpooling && (
            <>
              {hasRewards && onClaim && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => onClaim(pool, position)}
                >
                  <Gift size={14} />
                  Claim
                </Button>
              )}
              {onUnstake && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => onUnstake(pool, position)}
                >
                  <Clock size={14} />
                  Unstake
                </Button>
              )}
            </>
          )}
          {!position && !onStake && (
            <Button
              variant="primary"
              size="sm"
              className="flex-1 gap-1.5"
              disabled
            >
              <Zap size={14} />
              Stake
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
