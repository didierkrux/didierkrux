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
