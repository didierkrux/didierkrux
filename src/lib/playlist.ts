export interface AmbientTrack { id: string; title: string; artist: string; url: string }
export interface SetEntry { title: string; url: string }

export function nextIndex(current: number, length: number): number {
  if (length <= 0) return 0;
  return (current + 1) % length;
}

export function prevIndex(current: number, length: number): number {
  if (length <= 0) return 0;
  return (current - 1 + length) % length;
}

export function trackLabel(t: AmbientTrack | undefined): string {
  return t ? `${t.artist}, ${t.title}` : '';
}

/** Parse the JSON playlist embedded in the page; tolerant of a missing or broken block. */
export function parsePlaylist(json: string | null | undefined): AmbientTrack[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((t): t is AmbientTrack => !!t && typeof (t as AmbientTrack).url === 'string' && typeof (t as AmbientTrack).title === 'string')
      .map((t) => ({ id: String(t.id), title: t.title, artist: String(t.artist ?? ''), url: t.url }));
  } catch {
    return [];
  }
}

/** Parse the embedded Digital Krux set list; tolerant like parsePlaylist. */
export function parseSets(json: string | null | undefined): SetEntry[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((s): s is SetEntry => !!s && typeof (s as SetEntry).url === 'string' && typeof (s as SetEntry).title === 'string')
      .map((s) => ({ title: s.title, url: s.url }));
  } catch {
    return [];
  }
}
