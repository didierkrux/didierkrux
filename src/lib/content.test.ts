import { describe, it, expect } from 'vitest';
import { orderByOrderThenStart, orderProjects, formatRange, paragraphs } from './content';

const e = (id: string, start: string, order?: number, end?: string) => ({ id, data: { order, dates: { start, end } } });

describe('orderByOrderThenStart', () => {
  it('puts explicit order first, then newest start first', () => {
    const out = orderByOrderThenStart([e('old', '2018-06'), e('ba', '2021-05', 2), e('new', '2026-08'), e('devcon', '2025-05', 1)]);
    expect(out.map((x) => x.id)).toEqual(['devcon', 'ba', 'new', 'old']);
  });
  it('is stable for equal starts', () => {
    const out = orderByOrderThenStart([e('a', '2020-01'), e('b', '2020-01')]);
    expect(out.map((x) => x.id)).toEqual(['a', 'b']);
  });
});

describe('orderProjects', () => {
  const pe = (id: string, era: string, start: string, order?: number) => ({ id, data: { era, order, dates: { start } } });
  it('groups web3, then web2, then side, ordering inside each group', () => {
    const out = orderProjects([pe('old-side', 'side', '2010-06'), pe('paper', 'web2', '2008-09'), pe('ethpage', 'web3', '2026-08'), pe('devcon', 'web3', '2025-05', 1), pe('toasty', 'web2', '2019-12'), pe('vg', 'side', '2020-04')]);
    expect(out.map((x) => x.id)).toEqual(['devcon', 'ethpage', 'toasty', 'paper', 'vg', 'old-side']);
  });
});

describe('formatRange', () => {
  it('formats open ranges with the present label', () => {
    expect(formatRange({ start: '2021-05' })).toBe('May 2021 – now');
    expect(formatRange({ start: '2021-05' }, { present: 'Present' })).toBe('May 2021 – Present');
  });
  it('formats closed ranges and single months', () => {
    expect(formatRange({ start: '2019-12', end: '2020-10' })).toBe('Dec 2019 – Oct 2020');
    expect(formatRange({ start: '2024-06', end: '2024-06' })).toBe('Jun 2024');
  });
  it('handles year-only values', () => {
    expect(formatRange({ start: '2019' })).toBe('2019');
    expect(formatRange({ start: '2018-03', end: '2018-06' })).toBe('Mar 2018 – Jun 2018');
  });
});

describe('paragraphs', () => {
  it('splits on blank lines and trims', () => {
    expect(paragraphs('one\n\n  two  \n\n\nthree\n')).toEqual(['one', 'two', 'three']);
  });
});
