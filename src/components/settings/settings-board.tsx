"use client";

import { useEffect, useState } from "react";

import { AudioVolumeControls } from "@/components/audio/audio-volume-controls";
import { audioManager, playSfx, unlockAudio } from "@/lib/audio/audio-manager";
import { PixelButton } from "@/components/ui/pixel-button";
import { PixelLabel } from "@/components/ui/pixel-label";
import {
  PixelPanel,
  PixelPanelHeader,
  PixelPanelTitle,
} from "@/components/ui/pixel-panel";
import { cn } from "@/lib/utils";

const STORAGE_REDUCED = "board.display.reducedMotion";
const STORAGE_SCANLINES = "board.display.scanlines";

function readLocalFlag(key: string, whenMissing: boolean): boolean {
  if (typeof window === "undefined") return whenMissing;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return whenMissing;
    return raw === "1";
  } catch {
    return whenMissing;
  }
}

/**
 * Display + sound controls used on `/settings`. Persists to localStorage.
 */
export function SettingsBoard({ className }: { className?: string }) {
  const [musicAutoplay, setMusicAutoplay] = useState(() =>
    audioManager.getMusicAutoplay(),
  );
  const [reducedMotion, setReducedMotion] = useState(() =>
    readLocalFlag(STORAGE_REDUCED, false),
  );
  const [scanlines, setScanlines] = useState(() =>
    readLocalFlag(STORAGE_SCANLINES, true),
  );

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = reducedMotion
      ? "true"
      : "false";
    document.documentElement.dataset.scanlines = scanlines ? "on" : "off";
    try {
      window.localStorage.setItem(STORAGE_REDUCED, reducedMotion ? "1" : "0");
      window.localStorage.setItem(STORAGE_SCANLINES, scanlines ? "1" : "0");
    } catch {
      // ignore
    }
  }, [reducedMotion, scanlines]);

  return (
    <div className={cn("grid gap-6 lg:grid-cols-2", className)}>
      <PixelPanel tone="raised">
        <PixelPanelHeader>
          <PixelPanelTitle>Display</PixelPanelTitle>
        </PixelPanelHeader>
        <div className="space-y-5 p-5">
          <ToggleRow
            label="Reduce motion"
            description="Softens hops, dice tumbles, and idle bobbing."
            checked={reducedMotion}
            onChange={setReducedMotion}
          />
          <ToggleRow
            label="CRT scanlines"
            description="Soft horizontal lines on boards and the page field."
            checked={scanlines}
            onChange={setScanlines}
          />
          <p className="text-xs text-muted">
            Pixel fonts stay crisp either way. Colour theme stays on the
            phosphor cabinet palette.
          </p>
        </div>
      </PixelPanel>

      <PixelPanel tone="gold">
        <PixelPanelHeader>
          <PixelPanelTitle>Sound</PixelPanelTitle>
        </PixelPanelHeader>
        <div className="space-y-5 p-5">
          <AudioVolumeControls />
          <ToggleRow
            label="Music autoplay"
            description="Start the loop automatically after unlock."
            checked={musicAutoplay}
            onChange={(on) => {
              void unlockAudio();
              audioManager.setMusicAutoplay(on);
              setMusicAutoplay(on);
            }}
          />
          <PixelButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              void unlockAudio();
              playSfx("dice_roll");
            }}
          >
            Test dice SFX
          </PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <PixelLabel className="text-parchment">{label}</PixelLabel>
        <span className="mt-1 block text-xs text-muted">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-4 accent-gold"
      />
    </label>
  );
}
