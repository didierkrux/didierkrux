import { describe, it, expect } from 'vitest';
import { nextIndex, prevIndex, trackLabel, parsePlaylist, parseSets } from './playlist';

describe('playlist', () => {
  it('cycles indexes and survives an empty list', () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBe(0);
    expect(nextIndex(5, 0)).toBe(0);
    expect(prevIndex(0, 3)).toBe(2);
    expect(prevIndex(2, 3)).toBe(1);
    expect(prevIndex(0, 0)).toBe(0);
  });
  it('labels a track and an empty slot', () => {
    expect(trackLabel({ id: 'a', title: 'Museum Night', artist: 'GLiTCH', url: 'https://x/a.mp3' })).toBe('GLiTCH, Museum Night');
    expect(trackLabel(undefined)).toBe('');
  });
  it('parses the embedded playlist and drops junk', () => {
    const list = parsePlaylist(JSON.stringify([{ id: 'a', title: 'A', artist: 'B', url: 'https://x/a.mp3' }, { nope: true }, null]));
    expect(list).toHaveLength(1);
    expect(parsePlaylist('not json')).toEqual([]);
    expect(parsePlaylist(null)).toEqual([]);
  });
  it('parses the embedded set list the same way', () => {
    expect(parseSets(JSON.stringify([{ title: 'Get Free', url: 'https://x/a.mp3', extra: 1 }, { title: 'no url' }]))).toEqual([{ title: 'Get Free', url: 'https://x/a.mp3' }]);
    expect(parseSets('nope')).toEqual([]);
  });
});
