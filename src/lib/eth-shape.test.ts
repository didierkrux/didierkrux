import { describe, expect, it } from 'vitest';
import { ETH, ethDiamondFaces } from './eth-shape';

const normal = (t: number[]) => {
  const [ax, ay, az, bx, by, bz, cx, cy, cz] = t;
  const u = [bx - ax, by - ay, bz - az], v = [cx - ax, cy - ay, cz - az];
  return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
};

describe('eth diamond', () => {
  const { left, right } = ethDiamondFaces();
  it('has four faces per half', () => {
    expect(left).toHaveLength(4 * 9);
    expect(right).toHaveLength(4 * 9);
  });
  it('is taller than wide in the emblem\'s spirit', () => {
    const ys = [...left, ...right].filter((_, i) => i % 3 === 1);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(ETH.top + ETH.bottom);
    expect((ETH.top + ETH.bottom) / 2).toBeGreaterThan(1.5);
  });
  it('winds every face outward and keeps left faces on -x, right faces on +x', () => {
    for (const [half, sign] of [[left, -1], [right, 1]] as const) {
      for (let f = 0; f < half.length; f += 9) {
        const tri = half.slice(f, f + 9);
        const n = normal(tri);
        const cx = (tri[0] + tri[3] + tri[6]) / 3, cy = (tri[1] + tri[4] + tri[7]) / 3, cz = (tri[2] + tri[5] + tri[8]) / 3;
        expect(n[0] * cx + n[1] * cy + n[2] * cz).toBeGreaterThan(0); // normal points away from the center
        expect(Math.sign(cx)).toBe(sign);
      }
    }
  });
});
