"use client";

import { useState } from "react";

import { PixelButton } from "@/components/ui/pixel-button";
import {
  PixelPanel,
  PixelPanelHeader,
  PixelPanelTitle,
} from "@/components/ui/pixel-panel";
import { MOCK_ACCOUNT } from "@/lib/mock/account";
import { cn } from "@/lib/utils";

type ConnectState = "idle" | "connecting" | "connected" | "wrong_network";

/**
 * Mock Web3 wallet connect UI for Robinhood Chain · no real provider yet.
 */
export function WalletConnectPanel({ className }: { className?: string }) {
  const [state, setState] = useState<ConnectState>(
    MOCK_ACCOUNT.walletConnected ? "connected" : "idle",
  );
  const [address, setAddress] = useState(MOCK_ACCOUNT.walletAddress);

  function connect() {
    setState("connecting");
    window.setTimeout(() => {
      setAddress(MOCK_ACCOUNT.walletAddress);
      setState("connected");
    }, 700);
  }

  function disconnect() {
    setState("idle");
    setAddress("");
  }

  function switchNetwork() {
    setState("connecting");
    window.setTimeout(() => setState("connected"), 500);
  }

  return (
    <PixelPanel tone="raised" className={cn("overflow-hidden", className)}>
      <PixelPanelHeader>
        <PixelPanelTitle>Web3 wallet</PixelPanelTitle>
        <p className="font-pixel text-[8px] uppercase text-faint">
          Robinhood Chain
        </p>
      </PixelPanelHeader>

      <div className="space-y-4 p-5">
        {state === "idle" ? (
          <>
            <p className="text-sm leading-relaxed text-muted">
              Connect a wallet to deposit BOARD and withdraw winnings. Mock
              flow only · no extension required.
            </p>
            <PixelButton type="button" size="lg" onClick={connect}>
              Connect wallet
            </PixelButton>
          </>
        ) : null}

        {state === "connecting" ? (
          <p className="font-pixel text-[10px] uppercase text-gold">
            Waiting for wallet…
          </p>
        ) : null}

        {state === "connected" ? (
          <>
            <div className="border-2 border-success/40 bg-success/5 p-3">
              <p className="font-pixel text-[9px] uppercase text-success">
                Connected
              </p>
              <p className="mt-2 break-all font-mono text-xs text-parchment">
                {address}
              </p>
              <p className="mt-2 text-xs text-muted">
                Network: {MOCK_ACCOUNT.chain}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PixelButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setState("wrong_network")}
              >
                Simulate wrong network
              </PixelButton>
              <PixelButton
                type="button"
                variant="outline"
                size="sm"
                onClick={disconnect}
              >
                Disconnect
              </PixelButton>
            </div>
          </>
        ) : null}

        {state === "wrong_network" ? (
          <>
            <div
              role="alert"
              className="border-2 border-gold/50 bg-gold/5 p-3"
            >
              <p className="font-pixel text-[9px] uppercase text-gold">
                Wrong network
              </p>
              <p className="mt-2 text-sm text-muted">
                Switch to Robinhood Chain to move BOARD tokens.
              </p>
            </div>
            <PixelButton type="button" size="lg" onClick={switchNetwork}>
              Switch network
            </PixelButton>
          </>
        ) : null}
      </div>
    </PixelPanel>
  );
}
