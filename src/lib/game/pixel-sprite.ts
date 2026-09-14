/**
 * Tiny pixel-art format. A sprite is a palette plus rows of single-character
 * keys, one character per pixel · `.` is transparent. Storing art this way
 * keeps the landmarks in version control as readable data instead of binary
 * assets, and it renders crisply at any size.
 */
export type PixelSprite = {
  palette: Record<string, string>;
  rows: string[];
};

export type SpritePixel = {
  x: number;
  y: number;
  fill: string;
};

/** Flattens a sprite into drawable 1x1 pixels, skipping transparent cells. */
export function spritePixels(sprite: PixelSprite): SpritePixel[] {
  const pixels: SpritePixel[] = [];

  sprite.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const key = row[x];
      if (key === "." || key === " ") continue;

      const fill = sprite.palette[key];
      if (!fill) continue;

      pixels.push({ x, y, fill });
    }
  });

  return pixels;
}

export function spriteSize(sprite: PixelSprite) {
  return {
    width: Math.max(...sprite.rows.map((row) => row.length)),
    height: sprite.rows.length,
  };
}
