import * as THREE from 'three';

/**
 * Mixamo clips onto a VRM. The clips are skeleton-only glTF files exported from Mixamo FBX (FBX2glTF), the way
 * meeb.cam ships them; GLTFLoader drops the colon from `mixamorig:Hips`, hence the `mixamorigHips` keys.
 * The math follows pixiv's three-vrm humanoidAnimation example: every rotation is re-expressed relative to the
 * source skeleton's rest pose, hips travel is scaled to the target's hip height, and VRM 0.x gets its axis flip.
 */
export const MIXAMO_TO_VRM: Record<string, string> = {
  mixamorigHips: 'hips',
  mixamorigSpine: 'spine',
  mixamorigSpine1: 'chest',
  mixamorigSpine2: 'upperChest',
  mixamorigNeck: 'neck',
  mixamorigHead: 'head',
  mixamorigLeftShoulder: 'leftShoulder',
  mixamorigLeftArm: 'leftUpperArm',
  mixamorigLeftForeArm: 'leftLowerArm',
  mixamorigLeftHand: 'leftHand',
  mixamorigLeftHandThumb1: 'leftThumbMetacarpal',
  mixamorigLeftHandThumb2: 'leftThumbProximal',
  mixamorigLeftHandThumb3: 'leftThumbDistal',
  mixamorigLeftHandIndex1: 'leftIndexProximal',
  mixamorigLeftHandIndex2: 'leftIndexIntermediate',
  mixamorigLeftHandIndex3: 'leftIndexDistal',
  mixamorigLeftHandMiddle1: 'leftMiddleProximal',
  mixamorigLeftHandMiddle2: 'leftMiddleIntermediate',
  mixamorigLeftHandMiddle3: 'leftMiddleDistal',
  mixamorigLeftHandRing1: 'leftRingProximal',
  mixamorigLeftHandRing2: 'leftRingIntermediate',
  mixamorigLeftHandRing3: 'leftRingDistal',
  mixamorigLeftHandPinky1: 'leftLittleProximal',
  mixamorigLeftHandPinky2: 'leftLittleIntermediate',
  mixamorigLeftHandPinky3: 'leftLittleDistal',
  mixamorigRightShoulder: 'rightShoulder',
  mixamorigRightArm: 'rightUpperArm',
  mixamorigRightForeArm: 'rightLowerArm',
  mixamorigRightHand: 'rightHand',
  mixamorigRightHandThumb1: 'rightThumbMetacarpal',
  mixamorigRightHandThumb2: 'rightThumbProximal',
  mixamorigRightHandThumb3: 'rightThumbDistal',
  mixamorigRightHandIndex1: 'rightIndexProximal',
  mixamorigRightHandIndex2: 'rightIndexIntermediate',
  mixamorigRightHandIndex3: 'rightIndexDistal',
  mixamorigRightHandMiddle1: 'rightMiddleProximal',
  mixamorigRightHandMiddle2: 'rightMiddleIntermediate',
  mixamorigRightHandMiddle3: 'rightMiddleDistal',
  mixamorigRightHandRing1: 'rightRingProximal',
  mixamorigRightHandRing2: 'rightRingIntermediate',
  mixamorigRightHandRing3: 'rightRingDistal',
  mixamorigRightHandPinky1: 'rightLittleProximal',
  mixamorigRightHandPinky2: 'rightLittleIntermediate',
  mixamorigRightHandPinky3: 'rightLittleDistal',
  mixamorigLeftUpLeg: 'leftUpperLeg',
  mixamorigLeftLeg: 'leftLowerLeg',
  mixamorigLeftFoot: 'leftFoot',
  mixamorigLeftToeBase: 'leftToes',
  mixamorigRightUpLeg: 'rightUpperLeg',
  mixamorigRightLeg: 'rightLowerLeg',
  mixamorigRightFoot: 'rightFoot',
  mixamorigRightToeBase: 'rightToes',
};

/** The parts of a loaded glTF this needs. */
export interface ClipSource { scene: THREE.Object3D; animations: THREE.AnimationClip[] }

/** The parts of a three-vrm VRM this needs, so tests can pass a stand-in. */
export interface ClipTarget {
  meta?: { metaVersion?: string };
  humanoid: {
    normalizedRestPose: { hips?: { position?: number[] | null } | null };
    getNormalizedBoneNode(name: string): THREE.Object3D | null;
  };
}

function findClip(source: ClipSource): THREE.AnimationClip | null {
  return THREE.AnimationClip.findByName(source.animations, 'mixamo.com') ?? source.animations[0] ?? null;
}

function findHips(scene: THREE.Object3D): THREE.Object3D | null {
  let hit: THREE.Object3D | null = scene.getObjectByName('mixamorigHips') ?? null;
  if (!hit) scene.traverse((o) => { if (!hit && /Hips$/.test(o.name)) hit = o; });
  return hit;
}

export interface RetargetOptions {
  /** Keep the hips over the character's origin on the floor plane (dances travel across the room otherwise); height still moves. */
  inPlace?: boolean;
}

/** Retarget a Mixamo clip so the target's normalized humanoid bones can play it. Bones the target lacks are skipped. */
export function retargetMixamoClip(source: ClipSource, target: ClipTarget, name = 'clip', options: RetargetOptions = {}): THREE.AnimationClip {
  const clip = findClip(source);
  if (!clip) throw new Error('retarget: the source has no animation');
  source.scene.updateWorldMatrix(true, true);

  const vrm0 = target.meta?.metaVersion === '0';
  const motionHips = findHips(source.scene);
  const motionHipsHeight = motionHips?.position.y ?? 1;
  const targetHipsHeight = target.humanoid.normalizedRestPose.hips?.position?.[1] ?? motionHipsHeight;
  const hipsScale = motionHipsHeight > 0 ? targetHipsHeight / motionHipsHeight : 1;

  const restInverse = new THREE.Quaternion();
  const parentRest = new THREE.Quaternion();
  const q = new THREE.Quaternion();
  const tracks: THREE.KeyframeTrack[] = [];

  for (const track of clip.tracks) {
    const [sourceName, property] = track.name.split('.');
    const boneName = MIXAMO_TO_VRM[sourceName];
    const targetNode = boneName ? target.humanoid.getNormalizedBoneNode(boneName) : null;
    const sourceNode = source.scene.getObjectByName(sourceName);
    if (!targetNode || !sourceNode) continue;

    if (track instanceof THREE.QuaternionKeyframeTrack) {
      sourceNode.getWorldQuaternion(restInverse).invert();
      (sourceNode.parent ?? source.scene).getWorldQuaternion(parentRest);
      const values = Array.from(track.values);
      for (let i = 0; i < values.length; i += 4) {
        q.fromArray(values, i).premultiply(parentRest).multiply(restInverse);
        values[i] = vrm0 ? -q.x : q.x;
        values[i + 1] = q.y;
        values[i + 2] = vrm0 ? -q.z : q.z;
        values[i + 3] = q.w;
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(`${targetNode.name}.${property}`, Array.from(track.times), values));
    } else if (track instanceof THREE.VectorKeyframeTrack && property === 'position') {
      const values = Array.from(track.values).map((v, i) => (vrm0 && i % 3 !== 1 ? -v : v) * hipsScale);
      if (options.inPlace) for (let i = 0; i < values.length; i += 3) { values[i] = 0; values[i + 2] = 0; }
      tracks.push(new THREE.VectorKeyframeTrack(`${targetNode.name}.${property}`, Array.from(track.times), values));
    }
  }

  return new THREE.AnimationClip(name, clip.duration, tracks);
}
