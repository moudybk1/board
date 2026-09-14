import type { Metadata } from "next";

import { AudioUnlock } from "@/components/audio/audio-unlock";

import "./globals.css";

export const metadata: Metadata = {
  title: "BOARD | Play classic board games, win real tokens",
  description:
    "Monopoly and Ludo reimagined in premium pixel art. Four players per room, one winner, paid out in BOARD tokens on Robinhood Chain.",
};

/**
 * Root shell. Typography is Press Start 2P everywhere (loaded in globals.css).
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <AudioUnlock />
        {children}
      </body>
    </html>
  );
}
