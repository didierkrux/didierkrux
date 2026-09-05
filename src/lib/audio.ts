import { playing, track, setPlaying, dj, progress } from './stores';
import { nextIndex, prevIndex, trackLabel, type AmbientTrack, type SetEntry } from './playlist';

const SOUND_KEY = 'dk:sound';
const AMBIENT_VOLUME = 0.35;
const SET_VOLUME = 0.9;

let list: AmbientTrack[] = [];
let index = 0;
let sets: SetEntry[] = [];
let setIndex = -1;
let ambient: HTMLAudioElement | null = null;
let deck: HTMLAudioElement | null = null;
let fadeTimer: ReturnType<typeof setInterval> | null = null;
let ready = false;

const swallow = () => { /* autoplay refusal or network trouble; the intent stays in the stores and the next press retries */ };

function fadeTo(el: HTMLAudioElement, target: number, then?: () => void) {
  if (fadeTimer) clearInterval(fadeTimer);
  fadeTimer = setInterval(() => {
    const d = target - el.volume;
    if (Math.abs(d) < 0.03) { el.volume = target; if (fadeTimer) clearInterval(fadeTimer); fadeTimer = null; then?.(); return; }
    el.volume = Math.max(0, Math.min(1, el.volume + Math.sign(d) * 0.03));
  }, 60);
}

/** Is the ambient deck the one that should be heard right now? */
const ambientWanted = () => playing.get() && setPlaying.get() === null;

function startAmbient() {
  if (!ambient || !list.length) return;
  const el = ambient;
  const t = list[index];
  if (el.src !== t.url) el.src = t.url;
  el.volume = Math.min(el.volume, 0.05);
  el.play().then(() => { if (ambientWanted()) fadeTo(el, AMBIENT_VOLUME); else el.pause(); }).catch(swallow);
}

function pauseAmbient() {
  if (!ambient) return;
  const el = ambient;
  fadeTo(el, 0, () => el.pause());
}

/** Wire the two decks once. Ambient is the Turn On album; the set deck is a Digital Krux set (started from the world's booth). */
export function initAudio(tracks: AmbientTrack[], setList: SetEntry[] = []): void {
  if (ready) return;
  ready = true;
  list = tracks;
  sets = setList;
  index = 0;
  track.set(trackLabel(list[index]));

  ambient = new Audio();
  ambient.preload = 'none';
  ambient.volume = 0;
  ambient.addEventListener('ended', () => nextTrack());
  ambient.addEventListener('error', () => { if (list.length > 1) nextTrack(); });

  deck = new Audio();
  deck.preload = 'none';
  deck.addEventListener('ended', () => nextTrack()); // the sets run on as a playlist
  deck.addEventListener('error', () => stopSet());

  // Progress of whichever deck is active, for the seek bars.
  const report = (el: HTMLAudioElement) => () => { if (el === active()) progress.set({ current: el.currentTime || 0, duration: Number.isFinite(el.duration) ? el.duration : 0 }); };
  for (const el of [ambient, deck]) for (const ev of ['timeupdate', 'durationchange', 'loadedmetadata', 'emptied']) el.addEventListener(ev, report(el));

  // `playing` is the transport: play or pause whichever deck is active, and remember the choice.
  playing.listen((on) => {
    try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off'); } catch { /* fine */ }
    if (setPlaying.get() !== null) { if (on) deck?.play().catch(swallow); else deck?.pause(); }
    else if (on) startAmbient();
    else pauseAmbient();
  });

  // Sound was on last time: resume at the first gesture, which is when browsers allow it.
  let wantsSound = false;
  try { wantsSound = localStorage.getItem(SOUND_KEY) === 'on'; } catch { /* fine */ }
  if (wantsSound) {
    const arm = () => { window.removeEventListener('pointerdown', arm); window.removeEventListener('keydown', arm); if (!playing.get()) playing.set(true); };
    window.addEventListener('pointerdown', arm, { once: true });
    window.addEventListener('keydown', arm, { once: true });
  }
}

function active(): HTMLAudioElement | null {
  return setPlaying.get() !== null ? deck : ambient;
}

/** Jump to a position, 0 to 1, in whatever is loaded. */
export function seek(fraction: number): void {
  const el = active();
  if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return;
  el.currentTime = Math.max(0, Math.min(1, fraction)) * el.duration;
  progress.set({ current: el.currentTime, duration: el.duration });
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Space: pause or resume whatever is loaded, a set or the album. */
export function togglePlay(): void {
  playing.set(!playing.get());
}

function jumpTo(i: number): void {
  index = i;
  track.set(trackLabel(list[index]));
  progress.set({ current: 0, duration: 0 });
  if (ambient) {
    ambient.src = list[index].url;
    if (ambientWanted()) startAmbient();
  }
}

/** Next in the active playlist: the next set while a set is loaded, otherwise the next album track. */
export function nextTrack(): void {
  if (setPlaying.get() !== null) { if (sets.length) loadSet(nextIndex(setIndex, sets.length)); return; }
  if (list.length) jumpTo(nextIndex(index, list.length));
}

export function prevTrack(): void {
  if (setPlaying.get() !== null) { if (sets.length) loadSet(prevIndex(setIndex, sets.length)); return; }
  if (list.length) jumpTo(prevIndex(index, list.length));
}

function loadSet(i: number): void {
  const s = sets[i];
  if (!deck || !s) return;
  setIndex = i;
  if (ambient && !ambient.paused) pauseAmbient();
  setPlaying.set(s.title);
  dj.set(true);
  progress.set({ current: 0, duration: 0 });
  deck.src = s.url;
  deck.volume = SET_VOLUME;
  deck.play().catch(swallow);
  if (!playing.get()) playing.set(true);
}

/** Booth button: play a Digital Krux set. Pressing the loaded one again stops it and the album comes back. */
export function playSet(title: string, url: string): void {
  if (setPlaying.get() === title) { stopSet(); return; }
  let i = sets.findIndex((s) => s.url === url);
  if (i < 0) { sets = [...sets, { title, url }]; i = sets.length - 1; }
  loadSet(i);
}

/** Booth button: play one album track. Pressing the current one again pauses or resumes it. */
export function playTrack(i: number): void {
  if (i < 0 || i >= list.length) return;
  if (setPlaying.get() !== null) { deck?.pause(); setPlaying.set(null); dj.set(false); }
  else if (i === index) { togglePlay(); return; }
  jumpTo(i);
  if (!playing.get()) playing.set(true);
}

/** Take the set off the deck. DJ mode ends; if the transport is running the album resumes where it was. */
export function stopSet(): void {
  if (setPlaying.get() === null) return;
  deck?.pause();
  setPlaying.set(null);
  dj.set(false);
  progress.set({ current: 0, duration: 0 });
  if (playing.get()) startAmbient();
}
