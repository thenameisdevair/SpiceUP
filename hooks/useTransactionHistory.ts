import { useState, useEffect, useCallback } from "react";
import { getTxHistory, saveTx, type TxRecord } from "@/lib/txHistory";

export function useTransactionHistory() {
  const [history, setHistory] = useState<TxRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const records = await getTxHistory();
    setHistory(records);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const recordTx = useCallback(
    async (record: TxRecord) => {
      await saveTx(record);
      setHistory((prev) => [record, ...prev]);
    },
    []
  );

  return { history, loading, recordTx, refetch: load };
}
