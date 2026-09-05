import { packPages, chooseLayout, type PackItem, type LayoutCandidate } from './resume-pack';

export function mountResume(root: HTMLElement): void {
  const flow = root.querySelector<HTMLElement>('[data-flow]');
  const pagesEl = root.querySelector<HTMLElement>('[data-pages]');
  if (!flow || !pagesEl) return;
  const items = Array.from(flow.querySelectorAll<HTMLElement>('[data-rs-item]'));
  const opts = {
    minPages: Number(root.dataset.minPages) || 2,
    maxPages: Number(root.dataset.maxPages) || 3,
    hardMax: Number(root.dataset.hardMax) || 4,
  };

  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;height:calc(var(--rs-page-h) - 2 * var(--rs-margin))';
  root.appendChild(probe);
  const pageHeight = probe.getBoundingClientRect().height;
  probe.remove();

  const measure = (scale: number): PackItem[] => {
    root.style.setProperty('--rs-scale', String(scale));
    void flow.offsetHeight; // force layout at the new scale
    return items.map((el) => ({
      id: el.dataset.rsItem as string,
      height: el.getBoundingClientRect().height,
      keepWithNext: el.hasAttribute('data-keep-next'),
    }));
  };

  const candidates: LayoutCandidate[] = [];
  for (let s = 86; s <= 120; s += 2) {
    const scale = s / 100;
    candidates.push({ scale, result: packPages(measure(scale), pageHeight) });
  }
  const chosen = chooseLayout(candidates, opts);
  root.style.setProperty('--rs-scale', String(chosen.scale));

  pagesEl.replaceChildren();
  for (const p of chosen.result.pages) {
    const page = document.createElement('section');
    page.className = 'rs-page';
    page.style.rowGap = `${p.gap}px`;
    for (const id of p.ids) page.appendChild(items.find((el) => el.dataset.rsItem === id) as HTMLElement);
    pagesEl.appendChild(page);
  }
  flow.hidden = true;
  pagesEl.hidden = false;
  root.dataset.pages = String(chosen.result.pages.length);
  root.dataset.ok = String(chosen.ok);
  root.dataset.packed = 'true';
}
