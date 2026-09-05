/** The classic crab invader, 11 by 8 pixels, in its two frames. */
export const INVADER_A = [
  '..X.....X..',
  '...X...X...',
  '..XXXXXXX..',
  '.XX.XXX.XX.',
  'XXXXXXXXXXX',
  'X.XXXXXXX.X',
  'X.X.....X.X',
  '...XX.XX...',
];
export const INVADER_B = [
  '..X.....X..',
  'X..X...X..X',
  'X.XXXXXXX.X',
  'XXX.XXX.XXX',
  'XXXXXXXXXXX',
  '.XXXXXXXXX.',
  '..X.....X..',
  '.X.......X.',
];

/** Voxel centers for a bitmap, x to the right and y up, both centered on the origin, one unit per pixel.
    `lit` picks which characters count; by default anything but a dot. */
export function bitmapVoxels(rows: readonly string[], lit: (c: string) => boolean = (c) => c !== '.'): Array<{ x: number; y: number }> {
  const h = rows.length, w = rows[0].length;
  const out: Array<{ x: number; y: number }> = [];
  rows.forEach((row, r) => {
    [...row].forEach((c, col) => {
      if (lit(c)) out.push({ x: col - (w - 1) / 2, y: (h - 1) / 2 - r });
    });
  });
  return out;
}
