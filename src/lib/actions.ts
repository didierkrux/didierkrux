import { page, section, itemIndex, itemCount, panel, themePref, systemDark, dj, playing, type Page, type Section, type Panel } from './stores';
import { nextThemePref, type ThemePref } from './theme';
import { pageUrl } from './url';

export type ActionName =
  | 'section:top' | 'section:web3' | 'section:web2' | 'section:projects'
  | 'nextItem' | 'prevItem' | 'back' | 'play' | 'nextTrack' | 'prevTrack'
  | 'cycleTheme' | 'enterWorld' | 'openManual' | 'cycleMeebit' | 'toggleDj';

export interface AppState {
  page: Page;
  section: Section;
  itemIndex: number;
  itemCount: number;
  panel: Panel;
  themePref: ThemePref;
  systemDark: boolean;
  dj: boolean;
  playing: boolean;
}

export type Effect =
  | { type: 'navigate'; page: Page }
  | { type: 'scrollSection'; section: Section }
  | { type: 'scrollItem'; index: number }
  | { type: 'audio'; op: 'toggle' | 'next' | 'prev' | 'dj' }
  | { type: 'meebit' }
  | { type: 'pose'; dir: 1 | -1 };

type Result = { state: AppState; effects: Effect[] };

function goTo(s: AppState, target: Page): Result {
  if (target === s.page) return { state: s, effects: [] };
  return { state: { ...s, page: target, section: 'top', itemIndex: 0, panel: 'none' }, effects: [{ type: 'navigate', page: target }] };
}

function toSection(s: AppState, target: Section): Result {
  if (s.page !== 'home') return { ...goTo(s, 'home'), state: { ...goTo(s, 'home').state, section: target } };
  return { state: { ...s, section: target, panel: 'none' }, effects: [{ type: 'scrollSection', section: target }] };
}

export function applyAction(s: AppState, a: ActionName): Result {
  switch (a) {
    case 'section:top': return toSection(s, 'top');
    case 'section:web3': return toSection(s, 'web3');
    case 'section:web2': return toSection(s, 'web2');
    case 'section:projects': return toSection(s, 'projects');
    case 'nextItem': {
      if (s.page === 'world') return { state: s, effects: [{ type: 'pose', dir: 1 }] }; // in the world the arrows change the pose
      if (s.page !== 'home') return { state: s, effects: [] };
      // From the intro, down lands on the first project rather than skipping it.
      const i = s.section === 'top' ? 0 : Math.min(s.itemIndex + 1, Math.max(0, s.itemCount - 1));
      return { state: { ...s, itemIndex: i, panel: 'none' }, effects: s.section === 'top' || i !== s.itemIndex ? [{ type: 'scrollItem', index: i }] : [] };
    }
    case 'prevItem': {
      if (s.page === 'world') return { state: s, effects: [{ type: 'pose', dir: -1 }] };
      if (s.page !== 'home' || s.section === 'top') return { state: s, effects: [] };
      // Up from the first project goes back to the intro.
      if (s.itemIndex <= 0) return toSection(s, 'top');
      const i = s.itemIndex - 1;
      return { state: { ...s, itemIndex: i, panel: 'none' }, effects: [{ type: 'scrollItem', index: i }] };
    }
    case 'back':
      if (s.panel !== 'none') return { state: { ...s, panel: 'none' }, effects: [] };
      if (s.page !== 'home') return goTo(s, 'home');
      return { state: { ...s, section: 'top' }, effects: [{ type: 'scrollSection', section: 'top' }] };
    case 'play': return { state: s, effects: [{ type: 'audio', op: 'toggle' }] };
    case 'nextTrack': return { state: s, effects: [{ type: 'audio', op: 'next' }] };
    case 'prevTrack': return { state: s, effects: [{ type: 'audio', op: 'prev' }] };
    case 'cycleTheme': return { state: { ...s, themePref: nextThemePref(s.themePref, s.systemDark) }, effects: [] };
    case 'enterWorld': return goTo(s, s.page === 'world' ? 'home' : 'world');
    case 'openManual': return { state: { ...s, panel: s.panel === 'manual' ? 'none' : 'manual' }, effects: [] };
    case 'cycleMeebit': return { state: s, effects: [{ type: 'meebit' }] };
    case 'toggleDj': return { state: s, effects: [{ type: 'audio', op: 'dj' }] };
  }
}

export interface Effector {
  navigate(url: string): void;
  scrollSection(section: Section): void;
  scrollItem(index: number): void;
  audio(op: 'toggle' | 'next' | 'prev' | 'dj'): void;
  meebit(): void;
  pose(dir: 1 | -1): void;
}

let effector: Effector = { navigate() {}, scrollSection() {}, scrollItem() {}, audio() {}, meebit() {}, pose() {} };
export function setEffector(e: Effector): void { effector = e; }

export function readState(): AppState {
  return {
    page: page.get(), section: section.get(), itemIndex: itemIndex.get(), itemCount: itemCount.get(),
    panel: panel.get(), themePref: themePref.get(), systemDark: systemDark.get(), dj: dj.get(), playing: playing.get(),
  };
}

export function dispatch(a: ActionName): void {
  const { state, effects } = applyAction(readState(), a);
  if (state.page !== page.get()) page.set(state.page);
  if (state.section !== section.get()) section.set(state.section);
  if (state.itemIndex !== itemIndex.get()) itemIndex.set(state.itemIndex);
  if (state.panel !== panel.get()) panel.set(state.panel);
  if (state.themePref !== themePref.get()) themePref.set(state.themePref);
  if (state.dj !== dj.get()) dj.set(state.dj);
  if (state.playing !== playing.get()) playing.set(state.playing);
  for (const e of effects) {
    if (e.type === 'navigate') effector.navigate(pageUrl(e.page) + (state.section !== 'top' && e.page === 'home' ? `#${state.section}` : ''));
    else if (e.type === 'scrollSection') effector.scrollSection(e.section);
    else if (e.type === 'scrollItem') effector.scrollItem(e.index);
    else if (e.type === 'meebit') effector.meebit();
    else if (e.type === 'pose') effector.pose(e.dir);
    else effector.audio(e.op);
  }
}
