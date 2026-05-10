"use client";

import { useCallback, useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { usePathname } from "next/navigation";

type TokenResponse = {
  balance: number;
};

function formatTokenBalance(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function FitTokenBalancePill() {
  const pathname = usePathname();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadBalance = useCallback(async () => {
    try {
      const response = await fetch("/api/tokens", { cache: "no-store" });
      if (!response.ok) return;

      const data = (await response.json()) as TokenResponse;
      setBalance(Number(data.balance || 0));
    } catch {
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBalance();
  }, [loadBalance, pathname]);

  useEffect(() => {
    const handleRefresh = () => loadBalance();

    window.addEventListener("focus", handleRefresh);
    window.addEventListener("fitsched:tokens-updated", handleRefresh);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("fitsched:tokens-updated", handleRefresh);
    };
  }, [loadBalance]);

  return (
    <div className="inline-flex h-9 items-center gap-2 rounded-full border border-cyan-300/25 bg-[var(--surface)] px-3 text-cyan-300">
        <Coins size={15} aria-hidden="true" />
        <span className="text-xs font-bold tabular-nums">
          {loading ? "--" : formatTokenBalance(balance)}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] opacity-75">
          FT
        </span>
    </div>
  );
}
