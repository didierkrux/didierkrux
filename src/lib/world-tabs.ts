import { landing, scrollToElement } from './page-controller';

/** The world page scrolls through four parts under a sticky bar of links; the bar names the part in view and keeps
    it in the URL hash, so links and reloads land on the same part. */
export const WORLD_TABS = ['booth', 'meebit', 'poses', 'places'] as const;
export type WorldTab = (typeof WORLD_TABS)[number];

export function tabFromHash(hash: string): WorldTab {
  const id = hash.replace(/^#/, '');
  return (WORLD_TABS as readonly string[]).includes(id) ? (id as WorldTab) : 'booth';
}

/** Which part is in view: the last one whose top has reached the landing line (a little slack for rounding), else the first. */
export function currentPanel(tops: readonly number[], line: number): number {
  let best = 0;
  tops.forEach((t, i) => { if (t <= line + 2) best = i; });
  return best;
}

let cleanup: (() => void) | null = null;

export function mountWorldTabs(): void {
  cleanup?.();
  cleanup = null;
  const bar = document.querySelector<HTMLElement>('.world-tabs');
  const tabs = Array.from(document.querySelectorAll<HTMLElement>('[data-world-tab]'));
  const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-world-panel]'));
  if (!bar || !tabs.length || !panels.length) return;
  let current: WorldTab | null = null;
  const mark = (t: WorldTab) => {
    if (t === current) return;
    current = t;
    for (const b of tabs) b.setAttribute('aria-current', String(b.dataset.worldTab === t));
    history.replaceState(history.state, '', `#${t}`);
  };
  const track = () => {
    const box = bar.getBoundingClientRect();
    // Stuck once the bar has reached its sticky top; the ground behind the pills shows only then.
    bar.toggleAttribute('data-stuck', window.scrollY > 0 && box.top <= parseFloat(getComputedStyle(bar).top) + 1);
    const line = landing(panels[0]) + box.height;
    const i = currentPanel(panels.map((p) => p.getBoundingClientRect().top), line);
    mark(panels[i].dataset.worldPanel as WorldTab);
  };
  const onClick = (e: Event) => {
    e.preventDefault();
    const t = (e.currentTarget as HTMLElement).dataset.worldTab as WorldTab;
    const panel = panels.find((p) => p.dataset.worldPanel === t);
    if (panel) scrollToElement(panel, bar.getBoundingClientRect().height);
  };
  let raf = 0;
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; track(); }); };
  for (const b of tabs) b.addEventListener('click', onClick);
  window.addEventListener('scroll', onScroll, { passive: true });
  track();
  cleanup = () => {
    for (const b of tabs) b.removeEventListener('click', onClick);
    window.removeEventListener('scroll', onScroll);
    if (raf) cancelAnimationFrame(raf);
  };
}
