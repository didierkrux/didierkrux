import { describe, expect, it } from 'vitest';
import { INVADER_A, INVADER_B, bitmapVoxels } from './invader';

describe('invader voxels', () => {
  it('counts the lit pixels of both frames', () => {
    expect(bitmapVoxels(INVADER_A)).toHaveLength(46);
    expect(bitmapVoxels(INVADER_B)).toHaveLength(48);
  });
  it('is centered and symmetric', () => {
    const v = bitmapVoxels(INVADER_A);
    expect(v.reduce((s, p) => s + p.x, 0)).toBeCloseTo(0);
    expect(Math.max(...v.map((p) => p.y))).toBe(3.5);
    expect(Math.min(...v.map((p) => p.y))).toBe(-3.5);
  });
});
