import { useStore } from '@nanostores/react';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import { page, section, itemIndex, playing, setPlaying, meebit, meebitList, manualClip, clipPlaying, poseStep, moodFor, type Mood, type MeebitEntry } from '../lib/stores';
import { initMeebits, cycleMeebit } from '../lib/meebits';
import { stepPose } from '../lib/poses';
import { POOLS, clipUrl, clipName, poolFor, roleOf, loops, siblingsOf, nextIn, type Pool } from '../lib/anims';
import type { ClipRole } from '../lib/rig';
import { retargetMixamoClip } from '../lib/retarget';
import { MeebitRig } from '../lib/rig';

interface Props {
  meebits: MeebitEntry[];
  still: string;
  alt: string;
  labels: { swap: string; prev: string; next: string; pose: string };
}

/** Normalized pointer position in [-1, 1], shared with the scene without re-rendering React. */
const pointer = { x: 0, y: 0 };

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

interface MeebitProps { url: string; mood: Mood; grooving: boolean; dancing: boolean; manual: { id: string; nonce: number } | null; step: { dir: 1 | -1; n: number }; onReady: () => void; onClip: (id: string) => void }

/** The Meebit: a VRM driven by Mixamo clips (idle, look, wave, dance), with the head still following the pointer. */
function Meebit({ url, mood, grooving, dancing, manual, step, onReady, onClip }: MeebitProps) {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const rig = useRef<MeebitRig | null>(null);
  const loading = useRef(new Map<string, Promise<boolean>>());
  const roles = useRef(new Map<string, ClipRole>());
  const poolIndex = useRef<Record<Pool, number>>({ idle: 0, greet: 0, look: 0, dance: 0 });
  const want = useRef({ mood, dancing, manual });
  const look = useRef({ yaw: 0, pitch: 0 });
  const camTarget = useRef<{ y: number; dist: number } | null>(null);
  const group = useRef<THREE.Group>(null);
  const t = useRef(0);
  const { camera, size } = useThree();
  const bounds = useRef<{ height: number; width: number; centerY: number } | null>(null);
  const framesSinceLoad = useRef(0);
  const measured = useRef(false);

  // Measure the posed, skinned character (not the T-pose bind box) once it has rendered a couple of frames.
  const measure = (v: VRM) => {
    const box = new THREE.Box3();
    v.scene.updateWorldMatrix(true, true);
    v.scene.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isSkinnedMesh) return;
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
    const wide = want.current.dancing || (want.current.manual !== null && roleOf(want.current.manual.id) === 'action' && loops(want.current.manual.id));
    const room = wide ? 1.7 : 1.12;
    const target = { y: wide ? b.centerY * 0.7 : b.centerY, dist: Math.max(distH, distW) * room };
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
    const stale = () => rig.current !== r || want.current.mood !== w.mood || want.current.dancing !== w.dancing || want.current.manual?.id !== w.manual?.id || want.current.manual?.nonce !== w.manual?.nonce;
    const idleId = POOLS.idle[poolIndex.current.idle];
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
    const pool = poolFor(w.mood, w.dancing);
    const id = POOLS[pool][poolIndex.current[pool]];
    if (pool === 'dance') {
      if (!(await ensure(id, 'action')) || stale()) return;
      r.startAction(id);
      return;
    }
    const base = pool === 'look' ? id : idleId;
    if (!(await ensure(base, 'idle')) || stale()) return;
    r.stopAction();
    r.playIdle(base);
    if (pool === 'greet') {
      if (!(await ensure(id, 'action')) || stale()) return;
      r.startAction(id, 0.25);
    }
  }, [ensure]);

  useEffect(() => {
    want.current = { mood, dancing, manual };
    void sync();
  }, [mood, dancing, manual, vrm, sync]);

  /** Each step (a click on the character or the chip, a project change, the arrows in the world) moves through what is playing. */
  const lastStep = useRef(step.n);
  useEffect(() => {
    if (step.n === lastStep.current) return;
    lastStep.current = step.n;
    const m = want.current.manual;
    if (m) {
      const list = siblingsOf(m.id);
      manualClip.set({ id: list[(list.indexOf(m.id) + step.dir + list.length) % list.length], nonce: Date.now() });
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
      measured.current = false;
      framesSinceLoad.current = 0;
      bounds.current = null;
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
    const hips = bone('hips'), neck = bone('neck'), head = bone('head');
    const r = rig.current;

    if (r && r.current()) r.update(delta);
    else {
      // Until the first clip is in: arms down from the T-pose, a slow breath.
      const lUp = bone('leftUpperArm'), rUp = bone('rightUpperArm'), lLow = bone('leftLowerArm'), rLow = bone('rightLowerArm');
      if (lUp) lUp.rotation.set(0, 0, 1.15);
      if (rUp) rUp.rotation.set(0, 0, -1.15);
      if (lLow) lLow.rotation.set(0, 0, 0.15);
      if (rLow) rLow.rotation.set(0, 0, -0.15);
      if (hips) hips.position.y = Math.sin(time * 1.6) * 0.008;
    }

    // Head and neck follow the pointer on top of the clip, eased.
    const yaw = THREE.MathUtils.clamp(pointer.x * 0.55, -0.7, 0.7);
    const pitch = THREE.MathUtils.clamp(-pointer.y * 0.35, -0.4, 0.4);
    look.current.yaw = THREE.MathUtils.damp(look.current.yaw, yaw, 6, delta);
    look.current.pitch = THREE.MathUtils.damp(look.current.pitch, pitch, 6, delta);
    if (neck) { neck.rotation.y += look.current.yaw * 0.4; neck.rotation.x += look.current.pitch * 0.4; }
    if (head) { head.rotation.y += look.current.yaw * 0.6; head.rotation.x += look.current.pitch * 0.6; }

    // Music on but no dance: a nod on the beat.
    if (grooving && !dancing) {
      const beat = Math.sin(time * Math.PI * 2 * 2.0);
      if (head) head.rotation.x += Math.max(0, beat) * 0.14;
    }

    // Whole body turns a touch toward the pointer.
    if (group.current) group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, yaw * 0.25, 4, delta);

    // Ease the camera toward its framing.
    const ct = camTarget.current;
    if (ct) {
      camera.position.y = THREE.MathUtils.damp(camera.position.y, ct.y, 3, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, ct.dist, 3, delta);
      camera.lookAt(0, camera.position.y, 0);
    }

    vrm.update(delta);

    if (!measured.current && ++framesSinceLoad.current > 2) {
      measure(vrm);
      if (bounds.current) { measured.current = true; camTarget.current = null; fit(); }
    }
  });

  return <group ref={group} position={[0, -0.02, 0]}>{vrm && <primitive object={vrm.scene} onClick={onCharacterClick} />}</group>;
}

function Lights({ theme }: { theme: string }) {
  const lamp = useMemo(() => new THREE.Color(readToken('--lamp', '#ffd166')), [theme]);
  const dark = theme !== 'light';
  return (
    <>
      <hemisphereLight args={['#ffffff', '#6f7580', dark ? 1.0 : 1.3]} />
      <directionalLight position={[2.5, 4, 3]} intensity={dark ? 1.4 : 1.7} color={dark ? lamp : '#ffffff'} />
      <directionalLight position={[-3, 2, -2]} intensity={0.5} color={'#ffffff'} />
    </>
  );
}

export default function Stage({ meebits, still, alt, labels }: Props) {
  const p = useStore(page);
  const s = useStore(section);
  const ch = moodFor(p, s);
  const on = useStore(playing);
  const set = useStore(setPlaying);
  const dancing = on && set !== null;
  const current = useStore(meebit);
  const roster = useStore(meebitList);
  const manual = useStore(manualClip);
  useEffect(() => { manualClip.set(null); }, [p]);
  const instance = useRef<string>(Math.random().toString(36).slice(2, 10));
  const [gl, setGl] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const [clip, setClip] = useState('');
  const step = useStore(poseStep);
  // Every project change (arrows, swipe or scroll) brings the next pose with it.
  const item = useStore(itemIndex);
  const firstItem = useRef(true);
  useEffect(() => { if (firstItem.current) { firstItem.current = false; return; } stepPose(1); }, [item]);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    initMeebits(meebits);
    setGl(supportsWebGL());
    const root = document.documentElement;
    const read = () => setTheme(`${root.getAttribute('data-theme')}|${root.getAttribute('data-dj')}`);
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-dj'] });
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { mo.disconnect(); window.removeEventListener('pointermove', onMove); };
  }, [meebits]);

  const light = theme.startsWith('light');
  const entry = roster.find((m) => m.tokenId === current) ?? meebits[0];
  const onReady = useCallback(() => setReady(true), []);
  const onClip = useCallback((id: string) => { setClip(id); clipPlaying.set(id); }, []);

  return (
    <figure className="stage" data-stage data-instance={instance.current} data-mood={ch} data-ready={ready ? 'true' : 'false'} data-meebit={entry.tokenId} data-clip={clip} title={labels.pose}>
      {gl ? (
        <Canvas
          className="stage-canvas"
          flat
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ position: [0, 1.0, 4.5], fov: 26 }}
        >
          <Lights theme={light ? 'light' : 'dark'} />
          <Suspense fallback={null}>
            <Meebit url={entry.vrm} mood={ch} grooving={on} dancing={dancing} manual={manual} step={step} onReady={onReady} onClip={onClip} />
          </Suspense>
          <ContactShadows position={[0, 0, 0]} opacity={light ? 0.32 : 0.7} scale={3.2} blur={2.6} far={2} color={light ? '#1b1740' : '#000000'} />
        </Canvas>
      ) : null}
      {gl === false && <img className="stage-still" src={still} alt={alt} width={512} height={768} decoding="async" />}
      <div className="meebit-hud" title="" onPointerDown={(e) => e.stopPropagation()}>
        {clip && <button type="button" className="meebit-pose" title={labels.pose} onClick={() => stepPose(1)}>{clipName(clip)}</button>}
        <div className="meebit-picker" role="group" aria-label={labels.swap}>
          {roster.length > 1 && <button type="button" aria-label={labels.prev} onClick={() => cycleMeebit(-1)}>‹</button>}
          <span className="meebit-name">Meebit #{entry.tokenId}</span>
          {roster.length > 1 && <button type="button" aria-label={labels.next} onClick={() => cycleMeebit(1)}>›</button>}
        </div>
      </div>
    </figure>
  );
}
