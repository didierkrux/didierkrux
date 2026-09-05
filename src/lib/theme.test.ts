import { describe, it, expect } from 'vitest';
import { resolveTheme, nextThemePref, readPref, writePref, applyTheme, THEME_KEY } from './theme';

const memoryStorage = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('theme', () => {
  it('resolves system to the OS preference', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
  it('flips between light and dark, starting from what the system shows', () => {
    expect(nextThemePref('light', false)).toBe('dark');
    expect(nextThemePref('dark', false)).toBe('light');
    expect(nextThemePref('system', false)).toBe('dark');
    expect(nextThemePref('system', true)).toBe('light');
  });
  it('reads a stored preference and ignores junk', () => {
    const s = memoryStorage();
    expect(readPref(s)).toBe('system');
    writePref(s, 'dark');
    expect(s.getItem(THEME_KEY)).toBe('dark');
    expect(readPref(s)).toBe('dark');
    s.setItem(THEME_KEY, 'neon');
    expect(readPref(s)).toBe('system');
    expect(readPref(null)).toBe('system');
  });
  it('applies attributes to the root element', () => {
    const attrs: Record<string, string> = {};
    applyTheme({ setAttribute: (n, v) => void (attrs[n] = v) }, 'dark', true);
    expect(attrs).toEqual({ 'data-theme': 'dark', 'data-dj': 'on' });
  });
});
