export type ThemePref = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_KEY = 'dk:theme';
const PREFS: readonly ThemePref[] = ['light', 'dark', 'system'];

export function isThemePref(v: unknown): v is ThemePref {
  return typeof v === 'string' && (PREFS as readonly string[]).includes(v);
}

export function resolveTheme(pref: ThemePref, systemDark: boolean): ResolvedTheme {
  return pref === 'system' ? (systemDark ? 'dark' : 'light') : pref;
}

/** T flips between light and dark. From "system" it goes to the opposite of what is currently showing. */
export function nextThemePref(pref: ThemePref, systemDark: boolean): ThemePref {
  const current = resolveTheme(pref, systemDark);
  return current === 'dark' ? 'light' : 'dark';
}

export function readPref(storage: Pick<Storage, 'getItem'> | null | undefined): ThemePref {
  try {
    const v = storage?.getItem(THEME_KEY);
    return isThemePref(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

export function writePref(storage: Pick<Storage, 'setItem'> | null | undefined, pref: ThemePref): void {
  try {
    storage?.setItem(THEME_KEY, pref);
  } catch {
    // storage unavailable (private mode, blocked); the preference just does not persist
  }
}

export function applyTheme(
  root: { setAttribute(name: string, value: string): void },
  resolved: ResolvedTheme,
  dj: boolean,
): void {
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-dj', dj ? 'on' : 'off');
}
