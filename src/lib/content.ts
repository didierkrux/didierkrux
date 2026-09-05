export interface DatedEntry {
  id: string;
  data: { order?: number; dates: { start: string; end?: string } };
}

export function orderByOrderThenStart<T extends DatedEntry>(entries: T[]): T[] {
  const ordered = entries
    .filter((x) => typeof x.data.order === 'number')
    .sort((a, b) => (a.data.order as number) - (b.data.order as number));
  const rest = entries
    .filter((x) => typeof x.data.order !== 'number')
    .map((x, i) => ({ x, i }))
    .sort((a, b) => b.x.data.dates.start.localeCompare(a.x.data.dates.start) || a.i - b.i)
    .map(({ x }) => x);
  return [...ordered, ...rest];
}

export const orderRoles = orderByOrderThenStart;

export const ERA_ORDER = ['web3', 'web2', 'side'] as const;
export type Era = (typeof ERA_ORDER)[number];

/** Work order: grouped by era (web3, then web 2.0, then side projects), each group ordered like roles. */
export function orderProjects<T extends DatedEntry & { data: { era?: string } }>(entries: T[]): T[] {
  const rank = (e?: string) => { const i = (ERA_ORDER as readonly string[]).indexOf(e ?? ''); return i === -1 ? 99 : i; };
  const groups = new Map<string, T[]>();
  for (const e of entries) {
    const k = e.data.era ?? '';
    if (!groups.has(k)) groups.set(k, []);
    (groups.get(k) as T[]).push(e);
  }
  return [...groups.keys()].sort((a, b) => rank(a) - rank(b)).flatMap((k) => orderByOrderThenStart(groups.get(k) as T[]));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatPoint(value: string): string {
  const [year, month] = value.split('-');
  if (!month) return year;
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

export function formatRange(dates: { start: string; end?: string }, opts: { present?: string } = {}): string {
  const present = opts.present ?? 'now';
  const start = formatPoint(dates.start);
  if (dates.end === undefined) {
    // A year-only start with no end is a point in time (a diploma), not an open range.
    return dates.start.length === 4 ? start : `${start} – ${present}`;
  }
  if (dates.end === dates.start) return start;
  return `${start} – ${formatPoint(dates.end)}`;
}

export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export const SET_COUNT = 12;

/** The sets the DJ booth offers and the header steps through: the newest first. */
export function latestSets<T extends { data: { date: string } }>(entries: T[], count = SET_COUNT): T[] {
  return [...entries].sort((a, b) => b.data.date.localeCompare(a.data.date)).slice(0, count);
}
