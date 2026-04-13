"use client";

import { motion } from "framer-motion";
import { ArrowRightLeft, X, Play } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatBalance } from "@/lib/format";
import type { AppDcaOrder } from "@/lib/earn";

interface DcaOrderCardProps {
  order: AppDcaOrder;
  index?: number;
  onCancel?: (order: AppDcaOrder) => void;
}

export function DcaOrderCard({ order, index = 0, onCancel }: DcaOrderCardProps) {
  const isActive = order.status === "ACTIVE";
  const isIndexing = order.status === "INDEXING";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card padding="md" className="space-y-3">
        {/* Header: Pair + Status */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-spiceup-warning/15 border border-spiceup-warning/25 flex items-center justify-center">
              <ArrowRightLeft size={18} className="text-spiceup-warning" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">
                {order.sellToken} → {order.buyToken}
              </p>
              <p className="text-spiceup-text-muted text-xs">
                Every {order.frequency}
              </p>
            </div>
          </div>
          {isActive ? (
            <Badge variant="success" size="sm">
              ACTIVE
            </Badge>
          ) : isIndexing ? (
            <Badge variant="warning" size="sm">
              INDEXING
            </Badge>
          ) : null}
        </div>

        {/* Details */}
        <div className="bg-spiceup-bg/50 border border-spiceup-border/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-spiceup-text-muted text-xs">
              Per-cycle amount
            </span>
            <span className="text-white text-sm font-medium">
              {formatBalance(order.perCycleAmount)} {order.sellToken}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-spiceup-text-muted text-xs">
              Total budget
            </span>
            <span className="text-white text-sm font-medium">
              {formatBalance(order.sellAmount)} {order.sellToken}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-spiceup-text-muted text-xs">
              Executed trades
            </span>
            <span className="text-white text-sm font-medium">
              {order.executedTrades}
            </span>
          </div>
        </div>

        {/* Cancel button */}
        {onCancel && (isActive || isIndexing) && (
          <Button
            variant="destructive"
            size="sm"
            className="w-full gap-1.5"
            onClick={() => onCancel(order)}
          >
            <X size={14} />
            Cancel Order
          </Button>
        )}
      </Card>
    </motion.div>
  );
}
