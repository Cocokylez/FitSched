"use client";

import { useCallback, useEffect, useState } from "react";
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

  const displayBalance = loading ? "--" : formatTokenBalance(balance);

  return (
    <div
      aria-label={`${displayBalance} FitTokens`}
      className="inline-flex h-9 min-w-[88px] shrink-0 items-center justify-start gap-2.5 rounded-full border border-cyan-300/25 bg-[var(--surface)] px-3 text-cyan-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-cyan-300/35 bg-cyan-300/10 text-[8px] font-black leading-none tracking-normal">
        FT
      </span>
      <span className="min-w-0 whitespace-nowrap text-right text-xs font-extrabold leading-none tabular-nums">
        {displayBalance}
      </span>
    </div>
  );
}
