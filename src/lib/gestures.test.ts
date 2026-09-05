import { describe, it, expect, vi } from 'vitest';
import { createSwipeRecognizer } from './gestures';

const p = (x: number, y: number, t: number, type = 'touch') => ({ x, y, t, type });

describe('createSwipeRecognizer', () => {
  it('recognizes a horizontal swipe to the left', () => {
    const onSwipe = vi.fn();
    const r = createSwipeRecognizer({ onSwipe });
    r.down(p(300, 200, 0)); r.move(p(250, 205, 80)); r.up(p(180, 210, 160));
    expect(onSwipe).toHaveBeenCalledWith('left', expect.objectContaining({ x: 300, y: 200 }));
  });
  it('recognizes an upward swipe and reports the start sample', () => {
    const onSwipe = vi.fn();
    const r = createSwipeRecognizer({ onSwipe });
    r.down({ x: 100, y: 400, t: 0, type: 'touch', target: 'stage' }); r.up(p(105, 300, 200));
    expect(onSwipe).toHaveBeenCalledWith('up', expect.objectContaining({ target: 'stage' }));
  });
  it('ignores short moves, slow drags, diagonals, and mouse by default', () => {
    const onSwipe = vi.fn();
    const r = createSwipeRecognizer({ onSwipe });
    r.down(p(0, 0, 0)); r.up(p(20, 0, 100));
    r.down(p(0, 0, 0)); r.up(p(200, 0, 2500));
    r.down(p(0, 0, 0)); r.up(p(120, 100, 100));
    r.down(p(0, 0, 0, 'mouse')); r.up(p(200, 0, 100, 'mouse'));
    expect(onSwipe).not.toHaveBeenCalled();
  });
  it('treats a cancelled but clearly horizontal gesture as a swipe', () => {
    const onSwipe = vi.fn();
    const r = createSwipeRecognizer({ onSwipe });
    r.down(p(300, 200, 0)); r.move(p(200, 204, 90)); r.move(p(120, 210, 150)); r.cancel();
    expect(onSwipe).toHaveBeenCalledWith('left', expect.anything());
    r.down(p(300, 200, 0)); r.move(p(300, 300, 90)); r.cancel();   // vertical cancel = a scroll, not a swipe
    expect(onSwipe).toHaveBeenCalledTimes(1);
  });
  it('accepts mouse when allowed and cancels cleanly', () => {
    const onSwipe = vi.fn();
    const r = createSwipeRecognizer({ onSwipe, allowMouse: true });
    r.down(p(0, 0, 0, 'mouse')); r.up(p(200, 0, 100, 'mouse'));
    expect(onSwipe).toHaveBeenCalledWith('right', expect.anything());
    r.down(p(0, 0, 0)); r.cancel(); r.up(p(200, 0, 100));
    expect(onSwipe).toHaveBeenCalledTimes(1);
  });
});
