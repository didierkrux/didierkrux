import { describe, it, expect } from 'vitest';
import { applyAction, type AppState } from './actions';

const base: AppState = {
  page: 'home', section: 'top', itemIndex: 0, itemCount: 5,
  panel: 'none', themePref: 'system', systemDark: false, dj: false, playing: false,
};

describe('applyAction', () => {
  it('section keys scroll to the section on the home page', () => {
    const r = applyAction(base, 'section:web2');
    expect(r.state.section).toBe('web2');
    expect(r.effects).toEqual([{ type: 'scrollSection', section: 'web2' }]);
  });
  it('key 1 goes back to the top of the page', () => {
    const r = applyAction({ ...base, section: 'projects' }, 'section:top');
    expect(r.state.section).toBe('top');
    expect(r.effects).toEqual([{ type: 'scrollSection', section: 'top' }]);
  });
  it('section keys from the world navigate home first', () => {
    const r = applyAction({ ...base, page: 'world' }, 'section:projects');
    expect(r.state.page).toBe('home');
    expect(r.state.section).toBe('projects');
    expect(r.effects).toEqual([{ type: 'navigate', page: 'home' }]);
  });
  it('steps items within bounds and scrolls to them', () => {
    const inWeb3 = { ...base, section: 'web3' as const };
    const r = applyAction({ ...inWeb3, itemIndex: 2 }, 'nextItem');
    expect(r.state.itemIndex).toBe(3);
    expect(r.effects).toEqual([{ type: 'scrollItem', index: 3 }]);
    expect(applyAction({ ...inWeb3, itemIndex: 4 }, 'nextItem')).toMatchObject({ state: { itemIndex: 4 }, effects: [] });
    expect(applyAction({ ...inWeb3, itemIndex: 3 }, 'prevItem').effects).toEqual([{ type: 'scrollItem', index: 2 }]);
  });
  it('down from the intro lands on the first project, up from it goes back to the intro', () => {
    const down = applyAction(base, 'nextItem');
    expect(down.state.itemIndex).toBe(0);
    expect(down.effects).toEqual([{ type: 'scrollItem', index: 0 }]);
    const up = applyAction({ ...base, section: 'web3', itemIndex: 0 }, 'prevItem');
    expect(up.state.section).toBe('top');
    expect(up.effects).toEqual([{ type: 'scrollSection', section: 'top' }]);
    expect(applyAction(base, 'prevItem').effects).toEqual([]);
    expect(applyAction({ ...base, page: 'world' }, 'nextItem').effects).toEqual([{ type: 'pose', dir: 1 }]);
    expect(applyAction({ ...base, page: 'world' }, 'prevItem').effects).toEqual([{ type: 'pose', dir: -1 }]);
  });
  it('back closes the manual, and at rest scrolls to the top', () => {
    const closed = applyAction({ ...base, panel: 'manual' }, 'back');
    expect(closed.state.panel).toBe('none');
    expect(closed.effects).toEqual([]);
    const top = applyAction({ ...base, section: 'web2' }, 'back');
    expect(top.state.section).toBe('top');
    expect(top.effects).toEqual([{ type: 'scrollSection', section: 'top' }]);
  });
  it('back leaves the world', () => {
    const r = applyAction({ ...base, page: 'world' }, 'back');
    expect(r.state.page).toBe('home');
    expect(r.effects).toEqual([{ type: 'navigate', page: 'home' }]);
  });
  it('routes play to the audio effect, toggles the manual, and cycles the theme', () => {
    expect(applyAction(base, 'play').effects).toEqual([{ type: 'audio', op: 'toggle' }]);
    expect(applyAction(base, 'nextTrack').effects).toEqual([{ type: 'audio', op: 'next' }]);
    expect(applyAction(base, 'openManual').state.panel).toBe('manual');
    expect(applyAction({ ...base, panel: 'manual' }, 'openManual').state.panel).toBe('none');
    expect(applyAction(base, 'cycleTheme').state.themePref).toBe('dark');
    expect(applyAction({ ...base, systemDark: true }, 'cycleTheme').state.themePref).toBe('light');
  });
  it('enterWorld toggles between the world and home', () => {
    const inWorld = applyAction(base, 'enterWorld');
    expect(inWorld.state.page).toBe('world');
    expect(inWorld.effects).toEqual([{ type: 'navigate', page: 'world' }]);
    const out = applyAction(inWorld.state, 'enterWorld');
    expect(out.state.page).toBe('home');
  });
});
