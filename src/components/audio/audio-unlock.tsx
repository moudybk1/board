"use client";

import { useEffect } from "react";

import { audioManager, unlockAudio } from "@/lib/audio/audio-manager";
import { configureBoardMotion } from "@/lib/motion/gsap-config";

/**
 * Unlocks Web Audio on the first pointer / key gesture anywhere in the app,
 * then starts BGM when autoplay is enabled. Also warms GSAP defaults once.
 */
export function AudioUnlock() {
  useEffect(() => {
    configureBoardMotion();

    const unlock = () => {
      void unlockAudio().then(() => {
        if (
          audioManager.getMusicAutoplay() &&
          !audioManager.isMusicMuted()
        ) {
          audioManager.startMusic();
        }
      });
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return null;
}
