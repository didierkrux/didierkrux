import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { retargetMixamoClip, MIXAMO_TO_VRM, type ClipTarget } from './retarget';

/** A two-bone Mixamo-style skeleton: hips at 2.0 with the spine rotated 90° about X in its rest pose. */
function source() {
  const scene = new THREE.Group();
  const hips = new THREE.Object3D(); hips.name = 'mixamorigHips'; hips.position.set(0, 2, 0);
  const spine = new THREE.Object3D(); spine.name = 'mixamorigSpine'; spine.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  const finger = new THREE.Object3D(); finger.name = 'mixamorigLeftHandThumb1';
  scene.add(hips); hips.add(spine); spine.add(finger);
  const restQ = spine.quaternion.toArray();
  const clip = new THREE.AnimationClip('mixamo.com', 1, [
    new THREE.VectorKeyframeTrack('mixamorigHips.position', [0, 1], [1, 2, 3, 1, 2, 3]),
    new THREE.QuaternionKeyframeTrack('mixamorigSpine.quaternion', [0, 1], [...restQ, ...restQ]),
    new THREE.QuaternionKeyframeTrack('mixamorigLeftHandThumb1.quaternion', [0], [0, 0, 0, 1]),
    new THREE.QuaternionKeyframeTrack('mixamorigHeadTop_End.quaternion', [0], [0, 0, 0, 1]),
  ]);
  return { scene, animations: [clip] };
}

function target(metaVersion: string, hipsHeight = 1): ClipTarget {
  const nodes: Record<string, THREE.Object3D> = {};
  for (const n of ['hips', 'spine']) { nodes[n] = new THREE.Object3D(); nodes[n].name = `Normalized_${n}`; }
  return {
    meta: { metaVersion },
    humanoid: { normalizedRestPose: { hips: { position: [0, hipsHeight, 0] } }, getNormalizedBoneNode: (n) => nodes[n] ?? null },
  };
}

describe('retargetMixamoClip', () => {
  it('renames tracks to the target bones and drops bones the target lacks', () => {
    const clip = retargetMixamoClip(source(), target('1'), 'test');
    expect(clip.name).toBe('test');
    expect(clip.duration).toBe(1);
    expect(clip.tracks.map((t) => t.name).sort()).toEqual(['Normalized_hips.position', 'Normalized_spine.quaternion']);
  });
  it('scales hips travel to the target hip height', () => {
    const clip = retargetMixamoClip(source(), target('1', 0.5));
    const pos = clip.tracks.find((t) => t.name.endsWith('.position'))!;
    expect(Array.from(pos.values).slice(0, 3)).toEqual([0.25, 0.5, 0.75]);
  });
  it('expresses rotations relative to the source rest pose, so the rest pose becomes identity', () => {
    const clip = retargetMixamoClip(source(), target('1'));
    const rot = clip.tracks.find((t) => t.name.endsWith('.quaternion'))!;
    const [x, y, z, w] = Array.from(rot.values).slice(0, 4);
    expect(Math.abs(x) + Math.abs(y) + Math.abs(z)).toBeLessThan(1e-6);
    expect(w).toBeCloseTo(1);
  });
  it('flips x and z for VRM 0.x', () => {
    const clip = retargetMixamoClip(source(), target('0', 2));
    const pos = clip.tracks.find((t) => t.name.endsWith('.position'))!;
    expect(Array.from(pos.values).slice(0, 3)).toEqual([-1, 2, -3]);
  });
  it('can pin the hips in place on the floor while keeping their height', () => {
    const src = source();
    src.animations[0].tracks[0] = new THREE.VectorKeyframeTrack('mixamorigHips.position', [0, 1], [1, 2, 3, 5, 6, 7]);
    const clip = retargetMixamoClip(src, target('1', 2), 'dance', { inPlace: true });
    const pos = clip.tracks.find((t) => t.name.endsWith('.position'))!;
    expect(Array.from(pos.values)).toEqual([0, 2, 0, 0, 6, 0]);
  });
  it('uses the hips track height when the rig is collapsed, and drops hip travel when neither is usable', () => {
    const collapsed = source();
    collapsed.scene.getObjectByName('mixamorigHips')!.position.set(0, 0, 0);
    collapsed.animations[0].tracks[0] = new THREE.VectorKeyframeTrack('mixamorigHips.position', [0, 1], [0, 1, 0, 0, 1.2, 0]);
    const pos = retargetMixamoClip(collapsed, target('1', 0.5)).tracks.find((t) => t.name.endsWith('.position'))!;
    expect(Array.from(pos.values).map((v) => Math.round(v * 1000) / 1000)).toEqual([0, 0.455, 0, 0, 0.545, 0]); // scaled by 0.5 / mean(1, 1.2)
    const dead = source();
    dead.scene.getObjectByName('mixamorigHips')!.position.set(0, 0, 0);
    dead.animations[0].tracks[0] = new THREE.VectorKeyframeTrack('mixamorigHips.position', [0, 1], [0, 0.005, 0, 0, 0.005, 0]);
    expect(retargetMixamoClip(dead, target('1')).tracks.some((t) => t.name.endsWith('.position'))).toBe(false);
  });
  it('maps every bone Mixamo exports that VRM knows', () => {
    expect(MIXAMO_TO_VRM.mixamorigLeftUpLeg).toBe('leftUpperLeg');
    expect(MIXAMO_TO_VRM.mixamorigSpine2).toBe('upperChest');
    expect(Object.keys(MIXAMO_TO_VRM)).toHaveLength(52);
  });
});
