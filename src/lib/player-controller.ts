import { playing, track, setPlaying, progress } from './stores';
import { seek, formatTime } from './audio';

let unsubs: Array<() => void> = [];

/** Keeps the header player and the world's booth in sync with the audio stores. */
export function mountPlayer(): void {
  for (const u of unsubs) u();
  unsubs = [];
  const root = document.querySelector<HTMLElement>('[data-player]');
  const title = root?.querySelector<HTMLElement>('[data-track]');
  const toggle = root?.querySelector<HTMLButtonElement>('.player-toggle');
  const nows = Array.from(document.querySelectorAll<HTMLElement>('[data-now-playing]'));
  const seeks = Array.from(document.querySelectorAll<HTMLInputElement>('[data-seek]'));
  const times = Array.from(document.querySelectorAll<HTMLElement>('[data-time]'));
  // A control scoped with data-*="set" or "track" follows only that deck; an unscoped one follows whatever plays.
  const scopedOn = (scope: string | undefined) => {
    const set = setPlaying.get() !== null;
    if (scope === 'set') return set;
    if (scope === 'track') return !set;
    return true;
  };
  let dragging = false;
  for (const input of seeks) {
    input.addEventListener('pointerdown', () => { dragging = true; });
    input.addEventListener('pointerup', () => { dragging = false; input.blur(); }); // give the arrow keys back to the page
    input.addEventListener('input', () => seek(Number(input.value) / 1000));
    input.addEventListener('change', () => { dragging = false; seek(Number(input.value) / 1000); });
  }
  const renderProgress = () => {
    const { current, duration } = progress.get();
    for (const input of seeks) {
      const on = scopedOn(input.dataset.seek) && duration > 0;
      input.disabled = !on;
      const value = on ? Math.round((current / duration) * 1000) : 0;
      if (!dragging) input.value = String(value);
      input.setAttribute('aria-valuetext', on ? `${formatTime(current)} of ${formatTime(duration)}` : '');
      input.style.setProperty('--fill', `${value / 10}%`);
    }
    for (const t of times) t.textContent = scopedOn(t.dataset.time) && duration > 0 ? `${formatTime(current)} / ${formatTime(duration)}` : '';
  };

  const render = () => {
    const set = setPlaying.get();
    const on = playing.get();
    if (root) root.dataset.playing = String(on);
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(on));
      toggle.setAttribute('aria-label', on ? toggle.dataset.labelOn ?? '' : toggle.dataset.labelOff ?? '');
    }
    if (title) title.textContent = set ?? track.get();
    for (const n of nows) {
      const text = n.dataset.nowPlaying === 'track' ? (set === null && playing.get() ? track.get() : '') : set ?? '';
      n.textContent = text;
      n.hidden = text === '';
    }
    const press = (b: HTMLElement, on: boolean) => {
      b.setAttribute('aria-pressed', String(on));
      if (!on && document.activeElement === b) b.blur(); // a focus ring on the old choice would look like it still plays
    };
    for (const b of document.querySelectorAll<HTMLElement>('[data-set-title]')) press(b, b.dataset.setTitle === set);
    for (const b of document.querySelectorAll<HTMLElement>('[data-dj-toggle]')) press(b, set !== null);
    const ambientOn = set === null && playing.get();
    for (const b of document.querySelectorAll<HTMLElement>('[data-track-label]')) press(b, ambientOn && b.dataset.trackLabel === track.get());
  };
  unsubs.push(playing.subscribe(render), track.subscribe(render), setPlaying.subscribe(render), progress.subscribe(renderProgress), playing.subscribe(renderProgress), setPlaying.subscribe(renderProgress));
}
