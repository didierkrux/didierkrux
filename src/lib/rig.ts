import * as THREE from 'three';

export type ClipRole = 'idle' | 'gesture' | 'action';

interface Registered { action: THREE.AnimationAction; role: ClipRole }
interface Fade { from: number; to: number; dur: number; t: number }

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/**
 * Three layers over one mixer: a looping idle, one-shot gestures added on top of it (upper body only, additive),
 * and a full-body action such as a dance that takes the idle's place while it runs.
 */
export class MeebitRig {
  readonly mixer: THREE.AnimationMixer;
  private registered = new Map<string, Registered>();
  private fades = new Map<THREE.AnimationAction, Fade>();
  private idle: string | null = null;
  private action: string | null = null;
  /** Called whenever what the body does changes. */
  onChange: ((current: string) => void) | null = null;

  constructor(root: THREE.Object3D, private maskNodeNames: Set<string>) {
    this.mixer = new THREE.AnimationMixer(root);
    this.mixer.addEventListener('finished', (e) => {
      for (const [id, r] of this.registered) {
        if (r.action !== e.action) continue;
        if (r.role === 'gesture') this.fadeTo(r.action, 0, 0.3);
        else if (r.role === 'action' && this.action === id) this.stopAction();
      }
    });
  }

  register(id: string, clip: THREE.AnimationClip, role: ClipRole, options: { once?: boolean } = {}): void {
    const old = this.registered.get(id);
    if (old) { old.action.stop(); this.mixer.uncacheAction(old.action.getClip()); }
    let c = clip;
    if (role === 'gesture') {
      c = clip.clone();
      c.tracks = c.tracks.filter((t) => !this.maskNodeNames.has(THREE.PropertyBinding.parseTrackName(t.name).nodeName ?? ''));
      THREE.AnimationUtils.makeClipAdditive(c);
    }
    const action = this.mixer.clipAction(c);
    if (role === 'gesture') { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.blendMode = THREE.AdditiveAnimationBlendMode; }
    else if (options.once) { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; }
    else action.setLoop(THREE.LoopRepeat, Infinity);
    this.registered.set(id, { action, role });
  }

  has(id: string): boolean { return this.registered.has(id); }

  /** What the body is doing: the action if one runs, else the idle. */
  current(): string { return this.action ?? this.idle ?? ''; }

  playIdle(id: string, fade = 0.4): void {
    const next = this.registered.get(id);
    if (!next || next.role !== 'idle' || this.idle === id) return;
    const prev = this.idle ? this.registered.get(this.idle) : null;
    this.idle = id;
    if (this.action) return; // remembered; it takes over when the action ends
    next.action.reset().play();
    if (prev) { next.action.setEffectiveWeight(0); this.fadeTo(next.action, 1, fade); this.fadeTo(prev.action, 0, fade); }
    else next.action.setEffectiveWeight(1);
    this.onChange?.(this.current());
  }

  playGesture(id: string): void {
    const g = this.registered.get(id);
    if (!g || g.role !== 'gesture') return;
    this.fades.delete(g.action);
    g.action.reset().setEffectiveWeight(1).play();
  }

  startAction(id: string, fade = 0.5): void {
    const a = this.registered.get(id);
    if (!a || a.role !== 'action') return;
    if (this.action === id) { a.action.reset().play(); return; }
    const from = this.action ? this.registered.get(this.action) : this.idle ? this.registered.get(this.idle) : null;
    this.action = id;
    a.action.reset().setEffectiveWeight(0).play();
    this.fadeTo(a.action, 1, fade);
    if (from) this.fadeTo(from.action, 0, fade);
    this.onChange?.(this.current());
  }

  stopAction(fade = 0.5): void {
    if (!this.action) return;
    const a = this.registered.get(this.action);
    this.action = null;
    if (a) this.fadeTo(a.action, 0, fade);
    const idle = this.idle ? this.registered.get(this.idle) : null;
    if (idle) { idle.action.reset().setEffectiveWeight(0).play(); this.fadeTo(idle.action, 1, fade); }
    this.onChange?.(this.current());
  }

  private fadeTo(action: THREE.AnimationAction, to: number, dur: number): void {
    if (dur <= 0) { action.setEffectiveWeight(to); this.fades.delete(action); return; }
    this.fades.set(action, { from: action.getEffectiveWeight(), to, dur, t: 0 });
  }

  update(delta: number): void {
    for (const [action, f] of this.fades) {
      f.t += delta;
      const k = ease(f.t / f.dur);
      action.setEffectiveWeight(f.from + (f.to - f.from) * k);
      if (k >= 1) { this.fades.delete(action); if (f.to === 0) action.stop(); }
    }
    this.mixer.update(delta);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    for (const r of this.registered.values()) this.mixer.uncacheAction(r.action.getClip());
    this.registered.clear();
    this.fades.clear();
    this.idle = this.action = null;
  }
}
