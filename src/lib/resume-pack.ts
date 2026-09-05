export interface PackItem { id: string; height: number; keepWithNext?: boolean }
export interface PackedPage { ids: string[]; itemsHeight: number; gap: number; fill: number }
export interface PackResult { pages: PackedPage[]; overflowIds: string[] }
export interface LayoutCandidate { scale: number; result: PackResult }
export interface LayoutOptions { minPages: number; maxPages: number; hardMax: number }

function finishPage(list: PackItem[], pageHeight: number, minGap: number): PackedPage {
  const itemsHeight = list.reduce((s, x) => s + x.height, 0);
  const n = list.length;
  const gap = n > 1 ? Math.max(minGap, Math.floor((pageHeight - itemsHeight) / (n - 1))) : 0;
  return { ids: list.map((x) => x.id), itemsHeight, gap, fill: itemsHeight / pageHeight };
}

/** Greedy pager: items are atomic, a keepWithNext item travels with its successor. */
export function packPages(items: PackItem[], pageHeight: number, minGap = 6): PackResult {
  const units: PackItem[][] = [];
  for (let i = 0; i < items.length; i++) {
    const unit = [items[i]];
    while (items[i].keepWithNext && i + 1 < items.length) { i++; unit.push(items[i]); }
    units.push(unit);
  }
  const unitHeight = (u: PackItem[]) => u.reduce((s, x) => s + x.height, 0) + minGap * (u.length - 1);

  const pages: PackedPage[] = [];
  const overflowIds: string[] = [];
  let current: PackItem[] = [];
  let used = 0;

  for (const unit of units) {
    const h = unitHeight(unit);
    if (h > pageHeight) overflowIds.push(...unit.map((x) => x.id));
    const needed = current.length ? used + minGap + h : h;
    if (current.length && needed > pageHeight) {
      pages.push(finishPage(current, pageHeight, minGap));
      current = [];
      used = 0;
    }
    used = current.length ? used + minGap + h : h;
    current.push(...unit);
  }
  if (current.length) pages.push(finishPage(current, pageHeight, minGap));
  return { pages, overflowIds };
}

const lastFill = (c: LayoutCandidate) => c.result.pages[c.result.pages.length - 1]?.fill ?? 0;

/** Pick the scale whose layout hits the page target with the fullest last page; tie-break on scale closest to 1. */
export function chooseLayout(candidates: LayoutCandidate[], opts: LayoutOptions): LayoutCandidate & { ok: boolean } {
  const clean = candidates.filter((c) => c.result.overflowIds.length === 0);
  const valid = clean.filter((c) => c.result.pages.length >= opts.minPages && c.result.pages.length <= opts.maxPages);
  const pool = valid.length ? valid : clean.filter((c) => c.result.pages.length <= opts.hardMax);
  const last = pool.length ? pool : candidates.filter((c) => c.result.pages.length <= opts.hardMax);
  const final = last.length ? last : candidates;
  const sorted = [...final].sort((a, b) => lastFill(b) - lastFill(a) || Math.abs(a.scale - 1) - Math.abs(b.scale - 1));
  return { ...sorted[0], ok: valid.length > 0 };
}
