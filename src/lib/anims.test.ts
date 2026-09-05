import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { ANIMS, CATEGORIES, POOLS, BASE_IDLE, clipUrl, clipName, clipsIn, loops, roleOf, siblingsOf, poolFor, nextIn } from './anims';

describe('anims catalog', () => {
  it('has unique ids, known categories, and a file on disk for each clip', () => {
    expect(ANIMS.length).toBeGreaterThan(100);
    expect(new Set(ANIMS.map((a) => a.id)).size).toBe(ANIMS.length);
    const cats = new Set(CATEGORIES.map((c) => c.id));
    for (const a of ANIMS) { expect(cats.has(a.category)).toBe(true); expect(existsSync(`public/anims/${a.file}`)).toBe(true); }
  });
  it('resolves urls and names', () => {
    expect(clipUrl('break-3')).toBe('/anims/break-3.glb');
    expect(clipUrl('chilling')).toBe('/anims/standing.glb');
    expect(clipName('break-3')).toBe('Break 3');
  });
  it('every pool clip exists and pools follow the mood', () => {
    for (const ids of Object.values(POOLS)) for (const id of ids) expect(clipName(id)).not.toBe(id);
    expect(roleOf(BASE_IDLE)).toBe('idle');
    expect(POOLS.dance).toEqual(clipsIn('dance'));
    expect(poolFor('me', false)).toBe('greet');
    expect(poolFor('work', false)).toBe('work');
    expect(poolFor('world', false)).toBe('look');
    expect(poolFor('work', true)).toBe('dance');
    expect(nextIn('look', 2)).toBe(0);
    expect(nextIn('look', 0, -1)).toBe(2);
  });
  it('knows what loops and what runs once, and who the siblings are', () => {
    expect(loops('thriller')).toBe(true);
    expect(loops('idle-2')).toBe(true);
    expect(loops('wave-hey')).toBe(false);
    expect(roleOf('idle-2')).toBe('idle');
    expect(roleOf('thriller')).toBe('action');
    expect(siblingsOf('bow-1')).toEqual(clipsIn('greetings'));
  });
});
