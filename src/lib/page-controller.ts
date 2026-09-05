import { itemIndex, itemCount, panel, section, page, isSection, type Section } from './stores';

let unsubs: Array<() => void> = [];
let observers: IntersectionObserver[] = [];
let programmatic = 0;

function scrollTo(el: Element | null): void {
  if (!el) return;
  programmatic = performance.now();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

export function scrollToSection(s: Section): void {
  scrollTo(s === 'top' ? document.getElementById('top') : document.getElementById(s));
}

export function scrollToItem(index: number): void {
  const el = document.querySelector<HTMLElement>(`[data-item][data-index="${index}"]`);
  const sec = el?.closest<HTMLElement>('[data-section]') ?? null;
  // The first project of a section lands on the section heading, so the category is always in view with it.
  scrollTo(sec && sec.querySelector('[data-item]') === el ? sec : el);
  const id = sec?.dataset.section;
  if (id && isSection(id) && id !== section.get()) section.set(id);
}

/** Wires one page: current item and section follow the scroll position; tabs and keys highlight them. */
export function mountPage(): void {
  for (const u of unsubs) u();
  for (const o of observers) o.disconnect();
  unsubs = [];
  observers = [];

  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-item]'));
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'));
  const tabs = Array.from(document.querySelectorAll<HTMLElement>('[data-tab]'));
  itemCount.set(Math.max(1, items.length));

  const render = () => {
    const i = itemIndex.get();
    items.forEach((el, k) => {
      if (k === i) el.setAttribute('data-current', '');
      else el.removeAttribute('data-current');
    });
    const s = section.get();
    const p = page.get();
    for (const t of tabs) {
      const key = t.dataset.tab;
      t.setAttribute('aria-current', key === 'world' ? String(p === 'world') : String(p === 'home' && key === s));
    }
  };
  unsubs.push(itemIndex.subscribe(render), panel.subscribe(render), section.subscribe(render), page.subscribe(render));

  if (items.length) {
    // The current item is the one closest to the top of the viewport, measured in a band below the HUD.
    const io = new IntersectionObserver(() => {
      if (performance.now() - programmatic < 1000) return;
      let best = 0, bestDist = Infinity;
      items.forEach((el, k) => {
        const r = el.getBoundingClientRect();
        const dist = Math.abs(r.top - 96);
        if (r.bottom > 80 && dist < bestDist) { best = k; bestDist = dist; }
      });
      if (best !== itemIndex.get()) itemIndex.set(best);
    }, { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
    items.forEach((el) => io.observe(el));
    observers.push(io);
  }

  if (sections.length) {
    // Entries can be stale by the time the callback runs (first observation, or a key press that
    // scrolled the page in between), so decide from the current geometry: the section under the
    // viewport's midline wins.
    const io = new IntersectionObserver(() => {
      if (performance.now() - programmatic < 1000) return;
      const mid = window.innerHeight * 0.5;
      const hit = sections.find((el) => { const r = el.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
      const id = hit?.dataset.section;
      if (id && isSection(id) && id !== section.get()) section.set(id);
    }, { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.5, 1] });
    sections.forEach((el) => io.observe(el));
    observers.push(io);
  }
}
