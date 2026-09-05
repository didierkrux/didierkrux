import { navigate } from 'astro:transitions/client';
import { page, section, itemIndex, panel, themePref, systemDark, dj, manualClip } from './stores';
import { dispatch, setEffector, type ActionName } from './actions';
import { actionForKey } from './keymap';
import { createSwipeRecognizer, type PointerSample } from './gestures';
import { parsePage, sectionFromHash } from './url';
import { applyTheme, readPref, resolveTheme, writePref } from './theme';
import { mountPage, scrollToSection, scrollToItem } from './page-controller';
import { mountManual } from './manual-controller';
import { mountPlayer } from './player-controller';
import { initAudio, togglePlay, nextTrack, prevTrack, playSet, playTrack, toggleDj } from './audio';
import { parsePlaylist, parseSets } from './playlist';
import { cycleMeebit, selectMeebit, mountMeebitPicker } from './meebits';
import { requestClip, clearManualClip, mountPoses, stepPose } from './poses';
import { mountWorldTabs } from './world-tabs';

declare global {
  interface Window { __dkBooted?: boolean }
}

function isEditable(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName);
}

const sample = (e: PointerEvent): PointerSample => ({
  x: e.clientX, y: e.clientY, t: e.timeStamp, type: e.pointerType, target: e.target,
});

export function boot(): void {
  if (window.__dkBooted) return;
  window.__dkBooted = true;

  setEffector({
    navigate: (url) => { void navigate(url); },
    scrollSection: (s) => { scrollToSection(s); if (s !== 'top') history.replaceState(history.state, '', `#${s}`); else history.replaceState(history.state, '', location.pathname); },
    scrollItem: (i) => scrollToItem(i),
    audio: (op) => (op === 'toggle' ? togglePlay() : op === 'next' ? nextTrack() : op === 'prev' ? prevTrack() : toggleDj()),
    meebit: () => cycleMeebit(1),
    pose: (dir) => stepPose(dir),
  });

  initAudio(parsePlaylist(document.getElementById('ambient-playlist')?.textContent), parseSets(document.getElementById('sets-playlist')?.textContent));

  // Theme: store <-> root attributes <-> localStorage. Re-applied after every swap because
  // the client router copies <html> attributes from the incoming static page.
  themePref.set(readPref(localStorage));
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  systemDark.set(mq.matches);
  mq.addEventListener('change', () => systemDark.set(mq.matches));
  const paint = () => applyTheme(document.documentElement, resolveTheme(themePref.get(), mq.matches), dj.get());
  themePref.subscribe((p) => { writePref(localStorage, p); paint(); });
  dj.subscribe(paint);
  mq.addEventListener('change', paint);
  document.addEventListener('astro:after-swap', paint);

  // Keys
  document.addEventListener('keydown', (e) => {
    const a = actionForKey({ key: e.key, shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey, altKey: e.altKey, isEditable: isEditable(e.target) });
    if (!a) return;
    e.preventDefault();
    dispatch(a);
  });

  // Anything with data-action dispatches that action; a set button in the world plays that set
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    const setBtn = target?.closest<HTMLElement>('[data-set-url]');
    if (setBtn) { e.preventDefault(); playSet(setBtn.dataset.setTitle ?? '', setBtn.dataset.setUrl ?? ''); setBtn.blur(); return; } // the pressed state, not focus, marks what plays
    const trackBtn = target?.closest<HTMLElement>('[data-track-index]');
    if (trackBtn) { e.preventDefault(); playTrack(Number(trackBtn.dataset.trackIndex)); trackBtn.blur(); return; }
    const animBtn = target?.closest<HTMLElement>('[data-anim]');
    if (animBtn) { e.preventDefault(); const id = animBtn.dataset.anim ?? ''; if (manualClip.get()?.id === id) clearManualClip(); else requestClip(id); return; } // picking the running one again hands control back to the mood
    const meebitBtn = target?.closest<HTMLElement>('[data-meebit-pick]');
    if (meebitBtn) { e.preventDefault(); selectMeebit(Number(meebitBtn.dataset.meebitPick)); return; }
    const el = target?.closest<HTMLElement>('[data-action]');
    if (!el) return;
    e.preventDefault();
    dispatch(el.dataset.action as ActionName);
  });

  // Horizontal swipes move between projects; vertical swiping is plain scrolling.
  const rec = createSwipeRecognizer({
    onSwipe(dir, start) {
      const t = start.target instanceof HTMLElement ? start.target : null;
      if (t?.closest('[data-no-swipe]')) return;
      if (dir === 'left') dispatch('nextItem');
      else if (dir === 'right') dispatch('prevItem');
    },
  });
  document.addEventListener('pointerdown', (e) => rec.down(sample(e)), { passive: true });
  document.addEventListener('pointermove', (e) => rec.move(sample(e)), { passive: true });
  document.addEventListener('pointerup', (e) => rec.up(sample(e)), { passive: true });
  document.addEventListener('pointercancel', () => rec.cancel(), { passive: true });

  // Page sync on first load and after every client-side navigation
  document.addEventListener('astro:page-load', () => {
    const p = parsePage(location.pathname);
    if (p) page.set(p);
    section.set(p === 'home' ? sectionFromHash(location.hash) : 'top');
    itemIndex.set(0);
    panel.set('none');
    mountPage();
    mountManual(document.querySelector<HTMLDialogElement>('[data-manual]'));
    mountPlayer();
    mountPoses();
    mountMeebitPicker();
    mountWorldTabs();
    if (p === 'home' && location.hash) scrollToSection(sectionFromHash(location.hash));
  });
}
