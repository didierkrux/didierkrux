import { useStore } from '@nanostores/react';
import { Suspense, useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import { page, section, itemIndex, itemPose, playing, setPlaying, meebit, meebitList, manualClip, clipPlaying, poseStep, moodFor, type Mood, type MeebitEntry } from '../lib/stores';
import { initMeebits } from '../lib/meebits';
import { stepPose } from '../lib/poses';
import { POOLS, BASE_IDLE, LOOP_POOLS, anim, clipUrl, clipName, poolFor, roleOf, loops, siblingsOf, nextIn, type Pool } from '../lib/anims';
import type { ClipRole } from '../lib/rig';
import { retargetMixamoClip } from '../lib/retarget';
import { MeebitRig } from '../lib/rig';
import { ethDiamondFaces } from '../lib/eth-shape';
import { INVADER_A, INVADER_B, bitmapVoxels } from '../lib/invader';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface Props {
  meebits: MeebitEntry[];
  still: string;
  alt: string;
  /** The page being rendered, so the server and the first client render agree on the mood. */
  page: 'home' | 'world' | 'manual' | '404';
  labels: { swap: string; pose: string };
}

/** Normalized pointer position in [-1, 1], shared with the scene without re-rendering React. */
const pointer = { x: 0, y: 0 };
const qNeck = new THREE.Quaternion();
const qHead = new THREE.Quaternion();
const eOffset = new THREE.Euler();

/** Lower body: gestures never touch it, so a wave sits on top of whatever the legs are doing. */
const LOWER_BODY = ['hips', 'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot', 'leftToes', 'rightToes'] as const;

/** Clip files are fetched once per page load and retargeted per Meebit. */
const gltfCache = new Map<string, Promise<GLTF>>();
function loadGltf(url: string): Promise<GLTF> {
  let p = gltfCache.get(url);
  if (!p) { p = new GLTFLoader().loadAsync(url); gltfCache.set(url, p); p.catch(() => gltfCache.delete(url)); }
  return p;
}

function supportsWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function readToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

interface MeebitProps { url: string; mood: Mood; grooving: boolean; dancing: boolean; manual: { id: string; nonce: number } | null; pose: string | null; step: { dir: 1 | -1; n: number }; onReady: () => void; onClip: (id: string) => void }

/** The Meebit: a VRM driven by Mixamo clips (idle, look, wave, dance), with the head still following the pointer. */
function Meebit({ url, mood, grooving, dancing, manual, pose, step, onReady, onClip }: MeebitProps) {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const rig = useRef<MeebitRig | null>(null);
  const loading = useRef(new Map<string, Promise<boolean>>());
  const roles = useRef(new Map<string, ClipRole>());
  const poolIndex = useRef<Record<Pool, number>>({ work: 0, greet: 0, look: 0, dance: 0 });
  const want = useRef({ mood, dancing, manual, pose });
  want.current = { mood, dancing, manual, pose };
  const look = useRef({ yaw: 0, pitch: 0 });
  const camTarget = useRef<{ y: number; dist: number } | null>(null);
  const group = useRef<THREE.Group>(null);
  const t = useRef(0);
  const { camera, size } = useThree();
  const bounds = useRef<{ height: number; width: number; centerY: number } | null>(null);

  /**
   * Measure the character once, right after load, in one fixed pose: the rest pose with the arms down.
   * Measuring a live frame gave a different framing on every load depending on which clip frame it caught.
   */
  const measure = (v: VRM) => {
    const h = v.humanoid;
    h.resetNormalizedPose();
    h.getNormalizedBoneNode('leftUpperArm')?.rotation.set(0, 0, 1.15);
    h.getNormalizedBoneNode('rightUpperArm')?.rotation.set(0, 0, -1.15);
    h.update();
    v.scene.updateMatrixWorld(true);
    const box = new THREE.Box3();
    v.scene.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isSkinnedMesh) return;
      m.skeleton.update();
      m.computeBoundingBox();
      if (m.boundingBox) box.union(m.boundingBox.clone().applyMatrix4(m.matrixWorld));
    });
    if (box.isEmpty()) return;
    const sz = box.getSize(new THREE.Vector3());
    bounds.current = { height: sz.y, width: Math.max(sz.x, sz.z), centerY: box.getCenter(new THREE.Vector3()).y };
  };

  // Frame the whole character whatever the stage's aspect ratio.
  const fit = () => {
    const b = bounds.current;
    if (!b) return;
    const cam = camera as THREE.PerspectiveCamera;
    const vFov = (cam.fov * Math.PI) / 180;
    const aspect = size.width / Math.max(1, size.height);
    const distH = (b.height * 0.56) / Math.tan(vFov / 2);
    const distW = (b.width * 0.58) / (Math.tan(vFov / 2) * aspect);
    // A little air around the standing character; dances sprawl on the floor and jump, so the camera steps back further and aims lower.
    // Only dances get the wide framing: they sprawl on the floor and jump. A walk in place stays framed like an idle.
    // Wide whenever the scene dances (a set plays), so the props sit where the dance layout expects them, and for a hand-picked dance.
    const wide = want.current.dancing || (want.current.manual !== null && anim(want.current.manual.id)?.category === 'dance');
    // Pulling back keeps camera height and distance in the same ratio, so the floor stays on the same screen line
    // and the feet stay on the grid; the dancer only gets a little more room, not a drop to a distant floating figure.
    // The tall desktop column also gets a little more room and looks a touch higher, so the figure sits lower with its
    // feet on the floor grid and leaves air above the head for the props; the phone band keeps the tight fit.
    const band = aspect > 1.15;
    const room = (band ? 1.12 : 1.26) * (wide ? 1.2 : 1);
    const dist = Math.max(distH, distW) * room;
    // While a dance runs the column aims a little lower again, so the dancer rides higher on screen with the floor moves still in frame.
    const lift = band ? 0 : (wide ? 0.03 : 0.09) * 2 * dist * Math.tan(vFov / 2);
    const target = { y: b.centerY * (wide ? 1.2 : 1) + lift, dist };
    if (!camTarget.current) { cam.position.set(0, target.y, target.dist); cam.lookAt(0, target.y, 0); cam.updateProjectionMatrix(); }
    camTarget.current = target;
  };
  useEffect(fit, [size.width, size.height, vrm, dancing, manual]);

  /** Make sure a clip is loaded, retargeted onto the current Meebit, and registered in the role this use needs. */
  const ensure = useCallback((id: string, role: ClipRole = roleOf(id)): Promise<boolean> => {
    const r = rig.current;
    const v = vrmRef.current;
    if (!r || !v) return Promise.resolve(false);
    if (r.has(id) && roles.current.get(id) === role) return Promise.resolve(true);
    const key = `${id}:${role}`;
    let p = loading.current.get(key);
    if (!p) {
      // Concurrent callers share one load instead of one of them giving up.
      p = (async () => {
        try {
          const gltf = await loadGltf(clipUrl(id));
          if (rig.current !== r || vrmRef.current !== v) return false; // the Meebit changed meanwhile
          r.register(id, retargetMixamoClip(gltf, v, id, { inPlace: true }), role, { once: role === 'action' && !loops(id) });
          roles.current.set(id, role);
          return true;
        } catch {
          return false;
        } finally {
          loading.current.delete(key);
        }
      })();
      loading.current.set(key, p);
    }
    return p;
  }, []);

  /** Bring the body in line with a hand-picked clip, or with the mood and the music: a dance, a greeting over the idle, or an idle. */
  const sync = useCallback(async () => {
    const r = rig.current;
    if (!r) return;
    const w = { ...want.current };
    const stale = () => rig.current !== r || want.current.mood !== w.mood || want.current.dancing !== w.dancing || want.current.pose !== w.pose || want.current.manual?.id !== w.manual?.id || want.current.manual?.nonce !== w.manual?.nonce;
    const idleId = BASE_IDLE;
    if (w.manual) {
      const id = w.manual.id;
      if (roleOf(id) === 'idle') {
        if (!(await ensure(id, 'idle')) || stale()) return;
        r.stopAction();
        r.playIdle(id);
      } else {
        if (!(await ensure(idleId, 'idle')) || stale()) return;
        r.playIdle(idleId);
        if (!(await ensure(id, 'action')) || stale()) return;
        r.startAction(id, 0.3);
      }
      return;
    }
    // The current project's own clip stands in for the work pool and is kept even while a set plays (the scene dances
    // around it); without one, a set brings the dance pool. A hand pick still wins over both.
    const own = poolFor(w.mood, false) === 'work' ? w.pose : null;
    const pool = own ? 'work' : poolFor(w.mood, w.dancing);
    const id = own ?? POOLS[pool][poolIndex.current[pool]];
    if (pool === 'dance') {
      if (!(await ensure(id, 'action')) || stale()) return;
      r.startAction(id);
      return;
    }
    if (LOOP_POOLS.has(pool) || roleOf(id) === 'idle' || (id === w.pose && loops(id))) {
      // The clip is the base layer itself.
      if (!(await ensure(id, 'idle')) || stale()) return;
      r.stopAction();
      r.playIdle(id);
      return;
    }
    // A one-shot over the base idle: greeting, a line of talk, a reaction.
    if (!(await ensure(idleId, 'idle')) || stale()) return;
    r.stopAction();
    r.playIdle(idleId);
    if (!(await ensure(id, 'action')) || stale()) return;
    r.startAction(id, 0.25);
  }, [ensure]);

  useEffect(() => { void sync(); }, [mood, dancing, manual, pose, vrm, sync]);

  /** Each step (a click on the character or the chip, a project change, the arrows in the world) moves through what is playing. */
  const lastStep = useRef(step.n);
  useEffect(() => {
    if (step.n === lastStep.current) return;
    lastStep.current = step.n;
    // From a hand pick, or from a project's own clip, a step walks that clip's category as a hand pick.
    const anchor = want.current.manual?.id ?? (poolFor(want.current.mood, false) === 'work' ? want.current.pose : null);
    if (anchor) {
      const list = siblingsOf(anchor);
      manualClip.set({ id: list[(list.indexOf(anchor) + step.dir + list.length) % list.length], nonce: Date.now() });
      return;
    }
    const pool = poolFor(want.current.mood, want.current.dancing);
    poolIndex.current[pool] = nextIn(pool, poolIndex.current[pool], step.dir);
    void sync();
  }, [step, sync]);
  const onCharacterClick = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); stepPose(1); };

  useEffect(() => {
    let disposed = false;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(url, (gltf) => {
      const loaded = gltf.userData.vrm as VRM;
      if (disposed) { VRMUtils.deepDispose(loaded.scene); return; }
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.combineSkeletons(gltf.scene);
      VRMUtils.rotateVRM0(loaded); // VRM 0.x faces -Z; turn it toward the camera
      loaded.scene.traverse((o) => { o.frustumCulled = false; });
      const mask = new Set<string>();
      for (const b of LOWER_BODY) { const n = loaded.humanoid.getNormalizedBoneNode(b); if (n) mask.add(n.name); }
      rig.current = new MeebitRig(loaded.scene, mask);
      rig.current.onChange = onClip;
      roles.current.clear();
      vrmRef.current = loaded;
      measure(loaded);
      camTarget.current = null; // snap the camera to the new character, then ease from there
      fit();
      setVrm(loaded);
      onReady();
      void sync();
    });
    return () => {
      disposed = true;
      rig.current?.dispose();
      rig.current = null;
      const old = vrmRef.current;
      vrmRef.current = null;
      if (old) VRMUtils.deepDispose(old.scene);
      setVrm(null);
      onClip('');
    };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, delta) => {
    if (!vrm) return;
    t.current += delta;
    const time = t.current;
    const h = vrm.humanoid;
    const bone = (n: Parameters<typeof h.getNormalizedBoneNode>[0]) => h.getNormalizedBoneNode(n);
    const neck = bone('neck'), head = bone('head');
    const r = rig.current;

    if (r && r.current()) r.update(delta);
    else {
      // Until the first clip is in: the rest pose with the arms down. The hips stay put: the rig copies the
      // normalized hips' world position onto the skeleton, so any offset here would move the whole body.
      const lUp = bone('leftUpperArm'), rUp = bone('rightUpperArm'), lLow = bone('leftLowerArm'), rLow = bone('rightLowerArm');
      if (lUp) lUp.rotation.set(0, 0, 1.15);
      if (rUp) rUp.rotation.set(0, 0, -1.15);
      if (lLow) lLow.rotation.set(0, 0, 0.15);
      if (rLow) rLow.rotation.set(0, 0, -0.15);
    }

    // Head and neck follow the pointer on top of the clip, eased. Composed as quaternions: adding to Euler angles
    // decoded from a clip's quaternion flips near 90 degrees and made the head spin on some poses.
    const yaw = THREE.MathUtils.clamp(pointer.x * 0.55, -0.7, 0.7);
    const pitch = THREE.MathUtils.clamp(-pointer.y * 0.35, -0.4, 0.4);
    look.current.yaw = THREE.MathUtils.damp(look.current.yaw, yaw, 6, delta);
    look.current.pitch = THREE.MathUtils.damp(look.current.pitch, pitch, 6, delta);
    const nod = grooving && !dancing ? Math.max(0, Math.sin(time * Math.PI * 2 * 2.0)) * 0.14 : 0; // music on but no dance: a nod on the beat
    qNeck.setFromEuler(eOffset.set(look.current.pitch * 0.4, look.current.yaw * 0.4, 0));
    qHead.setFromEuler(eOffset.set(look.current.pitch * 0.6 + nod, look.current.yaw * 0.6, 0));
    if (neck) neck.quaternion.multiply(qNeck);
    if (head) head.quaternion.multiply(qHead);

    // Whole body turns a touch toward the pointer.
    if (group.current) group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, yaw * 0.25, 4, delta);

    // Ease the camera toward its framing.
    const ct = camTarget.current;
    if (ct) {
      camera.position.y = THREE.MathUtils.damp(camera.position.y, ct.y, 3, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, ct.dist, 3, delta);
      camera.lookAt(0, camera.position.y, 0);
    }

    vrm.update(delta); // copies the normalized pose, offsets included, onto the skeleton for this frame

    // Take the offsets back off the normalized bones. Clips that do not animate the neck or head would otherwise
    // keep last frame's offset and the additions would pile up into a spin.
    if (neck) neck.quaternion.multiply(qNeck.invert());
    if (head) head.quaternion.multiply(qHead.invert());
  });

  return <group ref={group} position={[0, -0.02, 0]}>{vrm && <primitive object={vrm.scene} onClick={onCharacterClick} />}</group>;
}

/** The sky behind the character: a moon and stars in the accent colors; the stars twinkle while the music plays. */
function Sky() {
  return (
    <div className="stage-sky" aria-hidden="true">
      <div className="sky-stars" />
      <div className="sky-moon" />
    </div>
  );
}

const FLOOR_COLS = 14;
const FLOOR_ROWS = 8;

/** The floor: a perspective grid of cells that light up in the accent colors while a set plays.
    Delays and periods come from the cell index, so server and client render the same floor. */
function Floor() {
  const cells = Array.from({ length: FLOOR_COLS * FLOOR_ROWS }, (_, i) => {
    const period = 1.6 + ((i * 7) % 5) * 0.35;
    const delay = -(((i * 13) % 17) / 17) * period;
    return <i key={i} style={{ '--t': `${period.toFixed(2)}s`, '--d': `${delay.toFixed(2)}s` } as CSSProperties} />;
  });
  return <div className="stage-floor" aria-hidden="true">{cells}</div>;
}

/** Where the props go, for the tall desktop column and for the wide phone band (the header overlaps the band's top).
    Horizontal positions are a share of the visible half-width at the prop's depth; `halfWidth` gives that width. */
const isBand = (size: { width: number; height: number }) => size.width / Math.max(1, size.height) > 1.15;
function halfWidth(camera: THREE.Camera, size: { width: number; height: number }, z: number): number {
  const cam = camera as THREE.PerspectiveCamera;
  return (cam.position.z - z) * Math.tan((cam.fov * Math.PI) / 360) * (size.width / Math.max(1, size.height));
}
const LAYOUT = {
  column: {
    ball: { fx: -0.62, y: 2.2 },
    rank: { cx: 0, y: 2.35 },
    gems: [{ fx: -0.62, y: 1.15 }, { fx: 0.7, y: 1.1 }, { fx: -0.45, y: 0.6 }, { fx: 0.72, y: 1.75 }],
  },
  band: {
    ball: { fx: -0.85, y: 1.65 },
    rank: { cx: 0.5, y: 1.8 },
    gems: [{ fx: -0.62, y: 1.5 }, { fx: 0.7, y: 1.1 }, { fx: -0.45, y: 0.85 }, { fx: 0.85, y: 1.3 }],
  },
};

/** Unit cubes at the given centers, merged into a single geometry. */
function cubesGeometry(cells: ReadonlyArray<{ x: number; y: number; z: number }>): THREE.BufferGeometry {
  const boxes = cells.map(({ x, y, z }) => new THREE.BoxGeometry(1, 1, 1).translate(x, y, z));
  const merged = mergeGeometries(boxes) ?? new THREE.BufferGeometry();
  boxes.forEach((b) => b.dispose());
  return merged;
}

/** One voxel per lit pixel of a bitmap, in the z = 0 plane. */
function voxelGeometry(rows: readonly string[]): THREE.BufferGeometry {
  return cubesGeometry(bitmapVoxels(rows).map(({ x, y }) => ({ x, y, z: 0 })));
}

/** Floating Ethereum diamonds behind the character: voxel solids (src/lib/eth-shape.ts) with a ridge toward the camera,
    the left half in a lighter tone of one accent and the right half in a darker one, like the emblem's two faces. Two hang there at rest; two more join while a set plays, and only then do
    they turn and drift. Horizontal placement is a share of the visible width at their depth, so they sit at the sides
    on any aspect ratio. */
const GEMS = [
  { z: -1.3, r: 0.165, ink: false, still: true },
  { z: -1.1, r: 0.123, ink: true, still: true },
  { z: -1.7, r: 0.095, ink: true, still: false },
  { z: -1.5, r: 0.114, ink: false, still: false },
];

function Gems({ theme, dancing }: { theme: string; dancing: boolean }) {
  const group = useRef<THREE.Group>(null);
  const tones = useMemo(() => {
    const tone = (name: string, fallback: string) => { const c = new THREE.Color(readToken(name, fallback)); return { light: c, dark: c.clone().multiplyScalar(0.68) }; };
    return { accent: tone('--accent', '#e737e9'), ink: tone('--accent-ink', '#0b6ff4') };
  }, [theme]);
  const faces = useMemo(() => {
    const geo = (pos: number[]) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; };
    const f = ethDiamondFaces();
    return { left: geo(f.left), right: geo(f.right) };
  }, []);
  const { camera, size } = useThree();
  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const lay = (isBand(size) ? LAYOUT.band : LAYOUT.column).gems;
    g.children.forEach((m, i) => {
      const spec = GEMS[i];
      m.visible = spec.still || dancing;
      m.position.x = lay[i].fx * halfWidth(camera, size, spec.z);
      const bob = dancing ? Math.sin(state.clock.elapsedTime * 1.3 + i * 1.7) * 0.06 : 0;
      m.position.y = lay[i].y + bob;
      if (dancing) m.rotation.y += delta * 0.7 * (i % 2 ? -1 : 1);
    });
  });
  return (
    <group ref={group}>
      {GEMS.map((g, i) => {
        const t = g.ink ? tones.ink : tones.accent;
        return (
          <group key={i} position={[0, 0, g.z]} scale={g.r}>
            <mesh geometry={faces.left}><meshStandardMaterial color={t.light} emissive={t.light} emissiveIntensity={0.25} roughness={0.45} flatShading /></mesh>
            <mesh geometry={faces.right}><meshStandardMaterial color={t.dark} emissive={t.dark} emissiveIntensity={0.25} roughness={0.45} flatShading /></mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Voxel invaders in a rank above the character. The middle one keeps watch at rest; the others come out while a set
    plays, and then the rank shuffles sideways in steps and flips between the two classic frames. The rank is centered
    on the layout's `cx` with at least 0.62 units between invaders (they are 0.5 wide), more when the view is wide. */
const INVADERS = [
  { ink: false, still: false },
  { ink: true, still: true },
  { ink: false, still: false },
];
const INVADER_Z = -2.2;

function Invaders({ theme, dancing }: { theme: string; dancing: boolean }) {
  const group = useRef<THREE.Group>(null);
  const colors = useMemo(() => ({ accent: new THREE.Color(readToken('--accent', '#e737e9')), ink: new THREE.Color(readToken('--accent-ink', '#0b6ff4')) }), [theme]);
  const frames = useMemo(() => [voxelGeometry(INVADER_A), voxelGeometry(INVADER_B)], []);
  const { camera, size } = useThree();
  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const frame = dancing ? Math.floor(t * 2) % 2 : 0;
    const shuffle = dancing ? Math.round(Math.sin(t * 0.9) * 3) * 0.07 : 0;
    const w = halfWidth(camera, size, INVADER_Z);
    const band = isBand(size);
    const lay = (band ? LAYOUT.band : LAYOUT.column).rank;
    const gap = Math.max(0.62, 0.35 * w);
    // The desktop camera steps back and aims higher for a dance, which would drag the rank down the screen: raise it to compensate.
    const y = lay.y + (dancing && !band ? 0.45 : 0);
    g.children.forEach((inv, i) => {
      const spec = INVADERS[i];
      inv.visible = spec.still || dancing;
      inv.position.set(lay.cx * w + (i - 1) * gap + shuffle, y, INVADER_Z);
      inv.children.forEach((m, k) => { m.visible = k === frame; });
    });
  });
  return (
    <group ref={group}>
      {INVADERS.map((inv, i) => (
        <group key={i} position={[0, 0, INVADER_Z]} scale={0.045}>
          {frames.map((geo, k) => (
            <mesh key={k} geometry={geo}>
              <meshStandardMaterial color={inv.ink ? colors.ink : colors.accent} emissive={inv.ink ? colors.ink : colors.accent} emissiveIntensity={0.25} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** A soft round glow for sprites. */
function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/** The disco ball, up in the left corner so it never covers the invaders: nothing at rest; while a set plays the mirror
    ball appears in its own glow, turns and shines. Its facets reflect a room environment map so they read as mirrors,
    a point light inside lights the scene, and a shell of small colored glints around it, turning the other way,
    stands for the spots a mirror ball throws around. */
const BALL_Z = -1.6;
const GLINTS = 28;

function DiscoBall({ theme, dancing }: { theme: string; dancing: boolean }) {
  const group = useRef<THREE.Group>(null);
  const ball = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const glints = useRef<THREE.Points>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const colors = useMemo(() => ({ accent: new THREE.Color(readToken('--accent', '#e737e9')), ink: new THREE.Color(readToken('--accent-ink', '#0b6ff4')) }), [theme]);
  const tex = useMemo(glowTexture, []);
  const { camera, size, gl } = useThree();
  const env = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const t = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return t;
  }, [gl]);
  const shell = useMemo(() => {
    // Glints on a loose sphere around the ball, seeded so every load looks the same.
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const pos = new Float32Array(GLINTS * 3), col = new Float32Array(GLINTS * 3);
    for (let i = 0; i < GLINTS; i++) {
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = 0.7 + rnd() * 0.55, s = Math.sqrt(1 - u * u);
      pos.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3);
      const c = i % 2 ? colors.ink : colors.accent;
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, [colors]);
  useFrame((state, delta) => {
    const g = group.current, m = ball.current, l = lamp.current, sp = glow.current, pts = glints.current;
    if (!g || !m || !l || !sp || !pts) return;
    // On the wide phone band the header sits over the top of the stage, so the ball hangs lower and smaller there.
    const band = isBand(size);
    const lay = (band ? LAYOUT.band : LAYOUT.column).ball;
    g.position.set(lay.fx * halfWidth(camera, size, BALL_Z), lay.y, BALL_Z);
    g.scale.setScalar(band ? 0.95 : 1);
    g.visible = dancing;
    if (!dancing) { l.intensity = 0; return; }
    const t = state.clock.elapsedTime;
    const pulse = 0.5 + 0.5 * Math.sin(t * 6);
    m.rotation.y += delta * 0.8;
    pts.rotation.y -= delta * 1.2;
    pts.rotation.z = Math.sin(t * 0.4) * 0.25;
    (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1 + 0.25 * pulse;
    (sp.material as THREE.SpriteMaterial).opacity = 0.35 + 0.3 * pulse;
    (pts.material as THREE.PointsMaterial).opacity = 0.55 + 0.45 * Math.sin(t * 9);
    l.intensity = 1.4 + 1.6 * pulse;
  });
  return (
    <group ref={group} position={[0, 0, BALL_Z]} visible={false}>
      <sprite ref={glow} scale={[1.7, 1.7, 1]}>
        <spriteMaterial map={tex} color={colors.ink} transparent depthWrite={false} opacity={0} />
      </sprite>
      <mesh ref={ball}>
        <sphereGeometry args={[0.28, 22, 14]} />
        <meshStandardMaterial color="#e6eaff" emissive={colors.ink} emissiveIntensity={0} metalness={1} roughness={0.12} envMap={env} envMapIntensity={1.5} flatShading />
      </mesh>
      <points ref={glints} geometry={shell}>
        <pointsMaterial map={tex} size={0.11} sizeAttenuation vertexColors transparent depthWrite={false} opacity={0.8} />
      </points>
      <pointLight ref={lamp} color={colors.ink} intensity={0} distance={5} decay={2} />
    </group>
  );
}

/** Club lights: three colored spots above the stage that take turns flashing and sweep across the character while a set plays. */
const SPOTS = [
  { x: -2.4, ink: false, speed: 1.3, phase: 0 },
  { x: 2.4, ink: true, speed: 1.7, phase: 2.1 },
  { x: 0, ink: false, speed: 1.1, phase: 4.2 },
];

function ClubLights({ theme, dancing }: { theme: string; dancing: boolean }) {
  const lights = useRef<THREE.SpotLight[]>([]);
  const targets = useMemo(() => SPOTS.map(() => new THREE.Object3D()), []);
  const colors = useMemo(() => ({ accent: new THREE.Color(readToken('--accent', '#e737e9')), ink: new THREE.Color(readToken('--accent-ink', '#0b6ff4')) }), [theme]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const slot = Math.floor(t * 2.4) % SPOTS.length;
    SPOTS.forEach((spec, i) => {
      const l = lights.current[i];
      if (!l) return;
      if (!dancing) { l.intensity = 0; return; }
      l.intensity = slot === i ? 4.5 : 0.7;
      targets[i].position.set(Math.sin(t * spec.speed + spec.phase) * 1.1, 0.9 + Math.cos(t * 0.7 + spec.phase) * 0.5, 0);
    });
  });
  return (
    <>
      {SPOTS.map((spec, i) => (
        <group key={i}>
          <spotLight ref={(el) => { if (el) lights.current[i] = el; }} position={[spec.x, 4.2, 1.4]} angle={0.3} penumbra={0.5} decay={0} intensity={0} color={spec.ink ? colors.ink : colors.accent} target={targets[i]} />
          <primitive object={targets[i]} />
        </group>
      ))}
    </>
  );
}

function Lights({ theme }: { theme: string }) {
  const lamp = useMemo(() => new THREE.Color(readToken('--lamp', '#ffd166')), [theme]);
  const dark = theme !== 'light';
  return (
    <>
      <hemisphereLight args={['#ffffff', '#6f7580', dark ? 1.0 : 1.3]} />
      <directionalLight position={[2.5, 4, 3]} intensity={dark ? 1.4 : 1.7} color={dark ? lamp : '#ffffff'} />
      <directionalLight position={[-3, 2, -2]} intensity={0.5} color={'#ffffff'} />
      {/* The spotlight on the character: from above and in front, aimed at the feet (the default target), a beam wide enough for the whole figure. */}
      <spotLight position={[0.8, 5.5, 3]} angle={0.36} penumbra={0.6} decay={0} intensity={dark ? 2.2 : 1.0} color={dark ? lamp : '#ffffff'} />
    </>
  );
}

export default function Stage({ meebits, still, alt, labels, page: pageProp }: Props) {
  const p = useStore(page);
  const s = useStore(section);
  // Stores may already reflect the URL before hydration; until mounted, show what the server showed.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const ch = mounted ? moodFor(p, s) : moodFor(pageProp === 'world' ? 'world' : 'home', 'top');
  const on = useStore(playing);
  const set = useStore(setPlaying);
  const dancing = on && set !== null;
  const current = useStore(meebit);
  const roster = useStore(meebitList);
  const manual = useStore(manualClip);
  useEffect(() => { manualClip.set(null); }, [p]);
  // A set starting always brings the dance, whatever pose was picked by hand.
  useEffect(() => { if (dancing) manualClip.set(null); }, [dancing]);
  const instance = useId(); // stable across server and client, unlike a random id
  const [gl, setGl] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const [clip, setClip] = useState('');
  const step = useStore(poseStep);
  // Every project change (arrows, swipe or scroll) brings the next pose with it.
  const item = useStore(itemIndex);
  const firstItem = useRef(true);
  const pose = useStore(itemPose);
  useEffect(() => {
    if (firstItem.current) { firstItem.current = false; return; }
    if (dancing) return; // a set is playing: the dance goes on, whatever card scrolls by
    manualClip.set(null); // a new card: its own clip, or the next of the pool, not the last hand pick
    if (!itemPose.get()) stepPose(1);
  }, [item]);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    initMeebits(meebits);
    setGl(supportsWebGL());
    const root = document.documentElement;
    const read = () => setTheme(root.getAttribute('data-theme') ?? 'light');
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { mo.disconnect(); window.removeEventListener('pointermove', onMove); };
  }, [meebits]);

  const light = theme === 'light';
  const entry = roster.find((m) => m.tokenId === current) ?? meebits[0];
  const onReady = useCallback(() => setReady(true), []);
  const onClip = useCallback((id: string) => { setClip(id); clipPlaying.set(id); }, []);

  return (
    <figure className="stage" data-stage data-instance={instance} data-mood={ch} data-dancing={mounted && dancing ? 'true' : 'false'} data-ready={ready ? 'true' : 'false'} data-meebit={entry.tokenId} data-clip={clip} title={labels.pose}>
      <Sky />
      <Floor />
      {gl ? (
        <Canvas
          className="stage-canvas"
          flat
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ position: [0, 1.0, 4.5], fov: 26 }}
        >
          <Lights theme={light ? 'light' : 'dark'} />
          <Gems theme={theme} dancing={dancing} />
          <Invaders theme={theme} dancing={dancing} />
          <DiscoBall theme={theme} dancing={dancing} />
          <ClubLights theme={theme} dancing={dancing} />
          <Suspense fallback={null}>
            <Meebit url={entry.vrm} mood={ch} grooving={on} dancing={dancing} manual={manual} pose={pose} step={step} onReady={onReady} onClip={onClip} />
          </Suspense>
          <ContactShadows position={[0, 0, 0]} opacity={light ? 0.32 : 0.7} scale={3.2} blur={2.6} far={2} color={light ? '#1b1740' : '#000000'} />
        </Canvas>
      ) : null}
      {gl === false && <img className="stage-still" src={still} alt={alt} width={512} height={768} decoding="async" />}
      <div className="meebit-hud" title="" onPointerDown={(e) => e.stopPropagation()}>
        {clip && <button type="button" className="meebit-pose" title={labels.pose} onClick={() => stepPose(1)}>{clipName(clip)}</button>}
      </div>
    </figure>
  );
}
