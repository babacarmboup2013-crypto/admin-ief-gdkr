"use client";

import { useEffect, useState } from "react";

export function useRows<T>(fetcher: () => Promise<T[]>, deps: unknown[]) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    fetcher()
      .then((data) => {
        if (active) setRows(data);
      })
      .catch(() => {
        if (active) setRows([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return {
    rows,
    setRows,
    loading,
    refresh: () => {
      setTick((t) => t + 1);
      setLoading(true);
    },
  };
}