"use client";

import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

import { audioManager, unlockAudio } from "@/lib/audio/audio-manager";
import { cn } from "@/lib/utils";

/**
 * Mute toggle for BOARD SFX. Unlocks AudioContext on first interaction.
 */
export function AudioMuteToggle({ className }: { className?: string }) {
  const [muted, setMuted] = useState(() => audioManager.isMuted());

  return (
    <button
      type="button"
      aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}
      aria-pressed={muted}
      className={cn(
        "pixel-corners grid size-8 place-items-center border-2 border-edge bg-surface text-muted transition-colors hover:border-edge-bright hover:text-parchment sm:size-9",
        className,
      )}
      onClick={() => {
        void unlockAudio();
        setMuted(audioManager.toggleMute());
      }}
    >
      {muted ? (
        <VolumeX className="size-3.5" aria-hidden />
      ) : (
        <Volume2 className="size-3.5" aria-hidden />
      )}
    </button>
  );
}
