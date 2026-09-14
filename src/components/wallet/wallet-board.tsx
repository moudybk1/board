"use client";

import { useState } from "react";

import { BoardAmount } from "@/components/ui/board-amount";
import { PixelButtonLink } from "@/components/ui/pixel-button";
import {
  PixelPanel,
  PixelPanelHeader,
  PixelPanelTitle,
} from "@/components/ui/pixel-panel";
import { DepositForm } from "@/components/wallet/deposit-form";
import { BalanceWidget } from "@/components/wallet/balance-widget";
import { NetworkStatusBanner } from "@/components/wallet/network-status-banner";
import { TransactionHistory } from "@/components/wallet/transaction-history";
import { WithdrawForm } from "@/components/wallet/withdraw-form";
import {
  MOCK_NETWORK,
  MOCK_WALLET_BALANCE,
  WALLET_PAGE,
  type WalletTab,
} from "@/lib/mock/wallet";
import { cn } from "@/lib/utils";

/**
 * Deposit & Withdraw shell with mock data: forms, history, balance widget, and
 * network / wallet status warnings.
 */
export function WalletBoard() {
  const [tab, setTab] = useState<WalletTab>("deposit");
  const balance = MOCK_WALLET_BALANCE;

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="font-pixel text-[9px] uppercase tracking-widest text-gold">
          Wallet
        </p>
        <h1 className="mt-3 font-pixel text-lg text-parchment text-shadow-pixel sm:text-xl">
          {WALLET_PAGE.title}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          {WALLET_PAGE.support}
        </p>
      </header>

      <NetworkStatusBanner />

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <BalanceWidget className="sm:col-span-1" />
        <BalanceTile label="Locked in rooms" value={balance.locked} />
        <BalanceTile
          label="Total on platform"
          value={balance.available + balance.locked}
        />
      </div>

      <PixelPanel tone="raised" className="overflow-hidden">
        <PixelPanelHeader>
          <PixelPanelTitle>Move BOARD</PixelPanelTitle>
          <p className="font-pixel text-[8px] uppercase text-faint">
            {MOCK_NETWORK.chain}
          </p>
        </PixelPanelHeader>

        <div className="flex border-b-2 border-edge">
          {(
            [
              { id: "deposit", label: "Deposit" },
              { id: "withdraw", label: "Withdraw" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "flex-1 px-4 py-3 font-pixel text-[10px] uppercase transition-colors",
                tab === item.id
                  ? "bg-gold/15 text-gold"
                  : "text-muted hover:bg-surface-hover hover:text-parchment",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          <p className="text-xs text-faint">{MOCK_NETWORK.walletLabel}</p>

          {tab === "deposit" ? <DepositForm /> : <WithdrawForm />}
        </div>
      </PixelPanel>

      <div className="flex justify-end">
        <PixelButtonLink href="/lobby" variant="ghost" size="sm">
          Back to lobby
        </PixelButtonLink>
      </div>

      <TransactionHistory />
    </div>
  );
}

function BalanceTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "gold";
}) {
  return (
    <div className="pixel-corners border-2 border-edge bg-ink/70 p-4">
      <p className="font-pixel text-[8px] uppercase text-faint">{label}</p>
      <div className="mt-2">
        <BoardAmount
          value={value}
          size="md"
          tone={tone === "gold" ? "gold" : "default"}
        />
      </div>
    </div>
  );
}
