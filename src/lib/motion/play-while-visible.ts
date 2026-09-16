import type gsap from "gsap";

/** Fraction of the element that must be on screen before playback resumes. */
const VISIBLE_THRESHOLD = 0.15;

/**
 * Run the given animations only while `element` is on screen, and return a
 * disposer.
 *
 * The landing demos loop with `repeat: -1` to show the games in motion. Off
 * screen that motion has no audience: it burns frames, and several loops
 * competing at once means none of them is the focal point.
 *
 * `getAnimations` is called on each visibility change so callers can add and
 * remove tweens while the demo runs.
 */
export function playWhileVisible(
  element: Element,
  getAnimations: () => gsap.core.Animation[],
): () => void {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      for (const animation of getAnimations()) {
        if (visible) animation.resume();
        else animation.pause();
      }
    },
    { threshold: VISIBLE_THRESHOLD },
  );

  observer.observe(element);
  return () => observer.disconnect();
}
