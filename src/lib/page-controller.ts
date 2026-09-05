import { itemIndex, itemCount, itemPose, panel, section, page, isSection, type Section } from './stores';

let unsubs: Array<() => void> = [];
let observers: IntersectionObserver[] = [];
let programmatic = 0;

/** Where a scrolled-to element lands: just below whatever covers the top of the content column, measured from the
    layout itself rather than from CSS values. On desktop that is the header; on touch the stage band the header floats
    over (the stage is only counted when it spans the content horizontally). Cards and, under the band, the sections
    keep a small breathing gap. Picking the current item uses the same number, so highlight and scroll targets agree. */
export function landing(el: Element): number {
  const content = document.getElementById('main')?.getBoundingClientRect();
  let covered = 0, banded = false;
  for (const sel of ['.topbar', '.stage']) {
    const box = document.querySelector(sel)?.getBoundingClientRect();
    if (!box || !content) continue;
    const overlapsX = box.right > content.left + 1 && box.left < content.right - 1;
    if (!overlapsX || box.top > 1) continue;
    covered = Math.max(covered, box.bottom);
    if (sel === '.stage') banded = true;
  }
  const gap = el.hasAttribute('data-item') || banded ? 16 : 0;
  return covered + gap;
}

/** Bottom of the readable area: above the bottom bar when it is shown. */
function readableBottom(): number {
  const bar = document.querySelector('.bottombar');
  return window.innerHeight - (bar ? bar.getBoundingClientRect().height : 0);
}

/** Scroll so `el` lands at its landing offset (plus `extra`, for a sticky bar of the page's own). Computed rather than
    scrollIntoView, which does not honor scroll-margin-top in every mobile browser. */
export function scrollToElement(el: Element, extra = 0): void {
  programmatic = performance.now();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const top = el.getBoundingClientRect().top + window.scrollY - landing(el) - extra;
  window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
}

function scrollTo(el: Element | null): void {
  if (el) scrollToElement(el);
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
    itemPose.set(items[i]?.dataset.pose ?? null);
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

  const pickItem = () => {
    if (!items.length || performance.now() - programmatic < 1000) return;
    // The current item is the one closest to where a scroll would land it.
    const anchor = landing(items[0]);
    let best = 0, bestDist = Infinity;
    items.forEach((el, k) => {
      const r = el.getBoundingClientRect();
      const dist = Math.abs(r.top - anchor);
      if (r.bottom > anchor && dist < bestDist) { best = k; bestDist = dist; }
    });
    if (best !== itemIndex.get()) itemIndex.set(best);
  };

  const pickSection = () => {
    if (!sections.length || performance.now() - programmatic < 1000) return;
    // Entries can be stale by the time an observer callback runs (first observation, or a key press
    // that scrolled the page in between), so decide from the current geometry: the section under
    // the midline of the readable area wins.
    const mid = (landing(sections[0]) + readableBottom()) / 2;
    const hit = sections.find((el) => { const r = el.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
    const id = hit?.dataset.section;
    if (id && isSection(id) && id !== section.get()) section.set(id);
  };

  if (items.length) {
    const io = new IntersectionObserver(pickItem, { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
    items.forEach((el) => io.observe(el));
    observers.push(io);
  }

  if (sections.length) {
    const io = new IntersectionObserver(pickSection, { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.5, 1] });
    sections.forEach((el) => io.observe(el));
    observers.push(io);
  }

  // Observers fire on band crossings, which can leave the last stop of a scroll unjudged; settle on
  // the final geometry once the scroll ends.
  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; pickItem(); pickSection(); });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  unsubs.push(() => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); });
}
