import type { ActionName } from './actions';

export interface KeyBinding {
  keys: string[];
  action: ActionName;
  label: string;
  hint: string;
  description: string;
  group: 'sections' | 'items' | 'system';
  /** Listed in the manual but not shown in the header bar. */
  hidden?: boolean;
  /** Section this key jumps to, used to highlight the current one. */
  section?: 'top' | 'web3' | 'web2' | 'projects';
}

export const KEYMAP: readonly KeyBinding[] = [
  { keys: ['1'], action: 'section:top', label: '1', hint: 'gm', description: 'Back up to the top, where the gm is', group: 'sections', section: 'top' },
  { keys: ['2'], action: 'section:web3', label: '2', hint: 'Web3', description: 'Jump to the web3 work', group: 'sections', section: 'web3' },
  { keys: ['3'], action: 'section:web2', label: '3', hint: 'Web 2.0', description: 'Jump to the web 2.0 years', group: 'sections', section: 'web2' },
  { keys: ['4'], action: 'section:projects', label: '4', hint: 'Projects', description: 'Jump to the side projects', group: 'sections', section: 'projects' },
  { keys: ['ArrowUp'], action: 'prevItem', label: '↑', hint: 'Prev', description: 'Previous project', group: 'items', hidden: true },
  { keys: ['ArrowDown'], action: 'nextItem', label: '↓', hint: 'Next', description: 'Next project', group: 'items', hidden: true },
  { keys: [' '], action: 'play', label: 'Space', hint: 'Sound', description: 'Play or pause. Meebits Turn On plays quietly while you read; in the world it can be a Digital Krux set', group: 'system', hidden: true },
  { keys: ['ArrowLeft'], action: 'prevTrack', label: '←', hint: 'Prev track', description: 'Previous track, or the previous set while one plays', group: 'system', hidden: true },
  { keys: ['ArrowRight'], action: 'nextTrack', label: '→', hint: 'Next track', description: 'Next track, or the next set while one plays', group: 'system', hidden: true },
  { keys: ['t', 'T'], action: 'cycleTheme', label: 'T', hint: 'Theme', description: 'Switch between light and dark', group: 'system', hidden: true },
  { keys: ['w', 'W'], action: 'enterWorld', label: 'W', hint: 'World', description: 'Enter or leave the world', group: 'system' },
  { keys: ['m', 'M'], action: 'cycleMeebit', label: 'M', hint: 'Meebit', description: 'Swap to another of my Meebits', group: 'system', hidden: true },
  { keys: ['?'], action: 'openManual', label: '?', hint: 'Manual', description: 'Open or close this manual', group: 'system' },
];

const byKey = new Map<string, KeyBinding>();
for (const b of KEYMAP) for (const k of b.keys) byKey.set(k, b);

export function actionForKey(e: { key: string; shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean; isEditable?: boolean }): ActionName | null {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (e.isEditable && e.key !== 'Escape') return null;
  if (e.shiftKey && e.key.startsWith('Arrow')) return null; // no Shift+arrow combos; letters and symbols already reflect Shift in e.key
  return byKey.get(e.key)?.action ?? null;
}

export function visibleBindings(): readonly KeyBinding[] {
  return KEYMAP.filter((b) => !b.hidden);
}
