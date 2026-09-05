import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MeebitRig } from './rig';

function rigWithClips() {
  const root = new THREE.Group();
  const head = new THREE.Object3D(); head.name = 'head';
  const leg = new THREE.Object3D(); leg.name = 'leg';
  root.add(head, leg);
  const clip = (name: string, dur = 2) => new THREE.AnimationClip(name, dur, [
    new THREE.QuaternionKeyframeTrack('head.quaternion', [0, dur], [0, 0, 0, 1, 0.1, 0, 0, 0.995]),
    new THREE.QuaternionKeyframeTrack('leg.quaternion', [0, dur], [0, 0, 0, 1, 0.1, 0, 0, 0.995]),
  ]);
  const rig = new MeebitRig(root, new Set(['leg']));
  rig.register('idle', clip('idle'), 'idle');
  rig.register('look', clip('look'), 'idle');
  rig.register('wave', clip('wave', 1), 'gesture');
  rig.register('dance', clip('dance'), 'action');
  return rig;
}

describe('MeebitRig', () => {
  it('plays an idle, crossfades to another, and reports what runs', () => {
    const rig = rigWithClips();
    rig.playIdle('idle');
    expect(rig.current()).toBe('idle');
    rig.playIdle('look', 0.2);
    rig.update(0.1);
    expect(rig.current()).toBe('look');
    rig.update(0.3);
    const idle = rig.mixer.existingAction(rig.mixer['_root'] ? (rig as unknown as { registered: Map<string, { action: THREE.AnimationAction }> }).registered.get('idle')!.action.getClip() : undefined as never);
    expect(idle?.isRunning() ?? false).toBe(false);
  });
  it('an action replaces the idle and hands back to it when stopped', () => {
    const rig = rigWithClips();
    rig.playIdle('idle');
    rig.startAction('dance', 0.2);
    expect(rig.current()).toBe('dance');
    rig.update(0.5);
    rig.stopAction(0.2);
    expect(rig.current()).toBe('idle');
  });
  it('a one-shot action hands back to the idle when it finishes and reports changes', () => {
    const rig = rigWithClips();
    const seen: string[] = [];
    rig.onChange = (c) => seen.push(c);
    rig.register('bow', new THREE.AnimationClip('bow', 0.5, [new THREE.QuaternionKeyframeTrack('head.quaternion', [0, 0.5], [0, 0, 0, 1, 0.1, 0, 0, 0.995])]), 'action', { once: true });
    rig.playIdle('idle');
    rig.startAction('bow', 0);
    expect(rig.current()).toBe('bow');
    for (let i = 0; i < 10; i++) rig.update(0.1);
    expect(rig.current()).toBe('idle');
    expect(seen).toEqual(['idle', 'bow', 'idle']);
  });
  it('gestures lose the masked lower-body tracks and become additive', () => {
    const rig = rigWithClips();
    const wave = (rig as unknown as { registered: Map<string, { action: THREE.AnimationAction }> }).registered.get('wave')!.action;
    expect(wave.getClip().tracks.map((t) => t.name)).toEqual(['head.quaternion']);
    expect(wave.blendMode).toBe(THREE.AdditiveAnimationBlendMode);
    rig.playGesture('wave');
    expect(wave.isRunning()).toBe(true);
  });
});
