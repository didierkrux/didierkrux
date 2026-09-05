/** The Ethereum diamond as one smooth solid: an elongated octahedron, the waist a little above the middle, no gap.
    The waist is a square with a corner toward the viewer (+z), so from the front the ridge splits the two faces like
    the emblem's center line. Units: the waist half-diagonal is 1. */
export const ETH = { top: 1.75, bottom: 1.55 } as const;

type V = [number, number, number];

/** Non-indexed triangle lists (x, y, z per vertex), wound counter-clockwise seen from outside, ready for flat shading.
    `left` holds the four faces on the -x side, `right` the four on the +x side, so each half can take its own tone. */
export function ethDiamondFaces(): { left: number[]; right: number[] } {
  const left: number[] = [], right: number[] = [];
  const ring: V[] = [[1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1]]; // +x, +z (near), -x, -z
  const top: V = [0, ETH.top, 0], bottom: V = [0, -ETH.bottom, 0];
  for (let i = 0; i < 4; i++) {
    const a = ring[i], b = ring[(i + 1) % 4];
    const side = a[0] + b[0] < 0 ? left : right; // the pair with the -x corner is the left face
    side.push(...top, ...b, ...a); // upper face
    side.push(...bottom, ...a, ...b); // lower face
  }
  return { left, right };
}
