import { describe, it, expect } from 'vitest';
import { nextTokenId } from './meebits';

describe('nextTokenId', () => {
  it('cycles both ways and copes with an unknown current id', () => {
    expect(nextTokenId([1, 2, 3], 1, 1)).toBe(2);
    expect(nextTokenId([1, 2, 3], 3, 1)).toBe(1);
    expect(nextTokenId([1, 2, 3], 1, -1)).toBe(3);
    expect(nextTokenId([1, 2, 3], 9, 1)).toBe(1);
    expect(nextTokenId([], 9, 1)).toBe(9);
  });
});
