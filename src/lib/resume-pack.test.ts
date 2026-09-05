import { describe, it, expect } from 'vitest';
import { packPages, chooseLayout, type LayoutCandidate } from './resume-pack';

const item = (id: string, height: number, keepWithNext = false) => ({ id, height, keepWithNext });

describe('packPages', () => {
  it('fills pages greedily and stretches the gaps so each page ends at the bottom', () => {
    const r = packPages([item('a', 400), item('b', 400), item('c', 300), item('d', 100)], 1000, 10);
    expect(r.pages.map((p) => p.ids)).toEqual([['a', 'b'], ['c', 'd']]);
    expect(r.pages[0].gap).toBe(200);
    expect(r.pages[1].gap).toBe(600);
    expect(r.pages[1].fill).toBeCloseTo(0.4);
    expect(r.overflowIds).toEqual([]);
  });
  it('keeps a heading with the item that follows it', () => {
    const r = packPages([item('x', 700), item('h', 50, true), item('y', 400)], 1000, 10);
    expect(r.pages.map((p) => p.ids)).toEqual([['x'], ['h', 'y']]);
  });
  it('reports items taller than a page instead of looping', () => {
    const r = packPages([item('huge', 1500), item('b', 100)], 1000, 10);
    expect(r.overflowIds).toEqual(['huge']);
    expect(r.pages.length).toBe(2);
  });
  it('uses zero gap on a single-item page', () => {
    expect(packPages([item('a', 300)], 1000).pages[0].gap).toBe(0);
  });
});

describe('chooseLayout', () => {
  const cand = (scale: number, pages: number, lastFill: number): LayoutCandidate => ({
    scale,
    result: { overflowIds: [], pages: Array.from({ length: pages }, (_, i) => ({ ids: [String(i)], itemsHeight: 0, gap: 0, fill: i === pages - 1 ? lastFill : 0.95 })) },
  });
  const opts = { minPages: 2, maxPages: 3, hardMax: 4 };

  it('prefers a valid page count with the fullest last page, then the scale closest to 1', () => {
    const chosen = chooseLayout([cand(0.9, 2, 0.5), cand(1.0, 3, 0.4), cand(1.04, 3, 0.8), cand(1.1, 4, 0.9)], opts);
    expect(chosen.scale).toBe(1.04);
    expect(chosen.ok).toBe(true);
  });
  it('falls back to the hard maximum when nothing hits the target', () => {
    const chosen = chooseLayout([cand(0.86, 4, 0.3), cand(0.9, 5, 0.9)], opts);
    expect(chosen.scale).toBe(0.86);
    expect(chosen.ok).toBe(false);
  });
  it('never picks a candidate with overflowing items when another is valid', () => {
    const bad = cand(1.0, 2, 0.9);
    bad.result.overflowIds = ['x'];
    const chosen = chooseLayout([bad, cand(0.96, 2, 0.6)], opts);
    expect(chosen.scale).toBe(0.96);
  });
});
