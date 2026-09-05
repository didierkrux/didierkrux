import { describe, it, expect } from 'vitest';
import { parsePage, sectionFromHash, pageUrl } from './url';

describe('url', () => {
  it('recognizes the home and world pages', () => {
    expect(parsePage('/')).toBe('home');
    expect(parsePage('/world')).toBe('world');
    expect(parsePage('/world/')).toBe('world');
    expect(parsePage('/resume')).toBeNull();
  });
  it('reads a section from the hash and falls back to top', () => {
    expect(sectionFromHash('#web2')).toBe('web2');
    expect(sectionFromHash('#nope')).toBe('top');
    expect(sectionFromHash('')).toBe('top');
  });
  it('builds page urls', () => {
    expect(pageUrl('home')).toBe('/');
    expect(pageUrl('world')).toBe('/world');
  });
});
