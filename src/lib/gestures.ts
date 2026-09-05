export type SwipeDir = 'left' | 'right' | 'up' | 'down';

export interface PointerSample {
  x: number;
  y: number;
  t: number;      // ms timestamp
  type: string;   // 'touch' | 'mouse' | 'pen'
  target?: unknown;
}

export interface SwipeOptions {
  threshold?: number;     // px, default 40
  maxDuration?: number;   // ms, default 1200
  dominance?: number;     // main axis must exceed the other by this factor, default 1.5
  allowMouse?: boolean;   // default false
  onSwipe: (dir: SwipeDir, start: PointerSample) => void;
}

export function createSwipeRecognizer(opts: SwipeOptions) {
  const threshold = opts.threshold ?? 40;
  const maxDuration = opts.maxDuration ?? 1200;
  const dominance = opts.dominance ?? 1.5;
  let start: PointerSample | null = null;
  let last: PointerSample | null = null;

  const accepts = (p: PointerSample) => p.type === 'touch' || p.type === 'pen' || (opts.allowMouse && p.type === 'mouse');

  const finish = (s: PointerSample, p: PointerSample, horizontalOnly: boolean) => {
    const dx = p.x - s.x, dy = p.y - s.y, dt = p.t - s.t;
    if (dt > maxDuration) return;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) < threshold) return;
    if (ax >= ay) {
      if (ax < ay * dominance) return;
      opts.onSwipe(dx < 0 ? 'left' : 'right', s);
    } else if (!horizontalOnly) {
      if (ay < ax * dominance) return;
      opts.onSwipe(dy < 0 ? 'up' : 'down', s);
    }
  };

  return {
    down(p: PointerSample) { start = accepts(p) ? p : null; last = null; },
    move(p: PointerSample) { if (start) last = p; },
    /** The browser took the gesture over (it decided to scroll). A clearly horizontal move still counts. */
    cancel() {
      if (start && last) finish(start, last, true);
      start = null;
      last = null;
    },
    up(p: PointerSample) {
      if (!start) return;
      const s = start;
      start = null;
      last = null;
      finish(s, p, false);
    },
  };
}
