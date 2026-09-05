import { describe, expect, it } from 'vitest';
import { WORLD_TABS, currentPanel, tabFromHash } from './world-tabs';

describe('world tabs', () => {
  it('reads the tab from the hash and falls back to the booth', () => {
    for (const t of WORLD_TABS) expect(tabFromHash(`#${t}`)).toBe(t);
    expect(tabFromHash('')).toBe('booth');
    expect(tabFromHash('#web3')).toBe('booth');
  });
  it('names the last part whose top has reached the landing line', () => {
    expect(currentPanel([300, 900, 1500, 2100], 120)).toBe(0); // nothing reached yet: the first
    expect(currentPanel([-400, 121, 700, 1300], 120)).toBe(1); // a hair past the line still counts
    expect(currentPanel([-900, -300, 60, 700], 120)).toBe(2);
  });
});
