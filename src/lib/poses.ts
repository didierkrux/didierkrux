import { manualClip, clipPlaying, poseStep } from './stores';
import { anim } from './anims';

/** Play one catalogued clip by hand. The stage keeps it until another pick, the auto button, or a page change. */
export function requestClip(id: string): void {
  if (!anim(id)) return;
  manualClip.set({ id, nonce: Date.now() });
}

/** Next or previous pose of whatever plays: a click on the character, a project change, or the arrows in the world. */
export function stepPose(dir: 1 | -1 = 1): void {
  poseStep.set({ dir, n: poseStep.get().n + 1 });
}

export function clearManualClip(): void {
  manualClip.set(null);
}

let unsubs: Array<() => void> = [];

/** The world's pose browser: the playing clip is pressed, the auto button when nothing is picked. */
export function mountPoses(): void {
  for (const u of unsubs) u();
  unsubs = [];
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-anim]'));
  const auto = document.querySelector<HTMLElement>('[data-anim-auto]');
  if (!buttons.length && !auto) return;
  const render = () => {
    const playing = clipPlaying.get();
    const manual = manualClip.get();
    for (const b of buttons) {
      const on = b.dataset.anim === playing;
      b.setAttribute('aria-pressed', String(on));
      if (!on && document.activeElement === b) b.blur();
    }
    auto?.setAttribute('aria-pressed', String(manual === null));
  };
  unsubs.push(clipPlaying.subscribe(render), manualClip.subscribe(render));
}
