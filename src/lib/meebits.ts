import { meebit, meebitList, type MeebitEntry } from './stores';

const KEY = 'dk:meebit';

export function nextTokenId(ids: readonly number[], current: number, dir: 1 | -1): number {
  if (!ids.length) return current;
  const i = ids.indexOf(current);
  if (i < 0) return ids[0];
  return ids[(i + dir + ids.length) % ids.length];
}

/** Register the roster once and restore the last choice. */
export function initMeebits(list: MeebitEntry[]): void {
  meebitList.set(list);
  let stored = NaN;
  try { stored = Number(localStorage.getItem(KEY)); } catch { /* fine */ }
  meebit.set(list.some((m) => m.tokenId === stored) ? stored : (list[0]?.tokenId ?? 0));
}

export function selectMeebit(tokenId: number): void {
  if (!meebitList.get().some((m) => m.tokenId === tokenId)) return;
  meebit.set(tokenId);
  try { localStorage.setItem(KEY, String(tokenId)); } catch { /* fine */ }
}

export function cycleMeebit(dir: 1 | -1 = 1): void {
  selectMeebit(nextTokenId(meebitList.get().map((m) => m.tokenId), meebit.get(), dir));
}

let unsubs: Array<() => void> = [];

/** World page: the `[data-meebit-pick]` buttons (not `data-meebit`, which the stage figure carries) show which Meebit is on stage; a click on one selects it (wired in boot). */
export function mountMeebitPicker(): void {
  for (const u of unsubs) u();
  unsubs = [];
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-meebit-pick]'));
  if (!buttons.length) return;
  const render = () => {
    const current = meebit.get();
    for (const b of buttons) {
      const on = Number(b.dataset.meebitPick) === current;
      b.setAttribute('aria-pressed', String(on));
      if (!on && document.activeElement === b) b.blur();
    }
  };
  render();
  unsubs.push(meebit.subscribe(render));
}
