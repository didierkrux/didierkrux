import type { Mood } from './stores';
import type { ClipRole } from './rig';
import catalog from './animations.json';

/**
 * Every clip the character can play: Mixamo animations as skeleton-only glTF in public/anims, catalogued the way
 * meeb.cam does it (src/lib/animations.json, fetched by scripts/import-animations.mjs).
 */
export type Category = 'greetings' | 'idle' | 'dance' | 'emote' | 'reaction' | 'interaction' | 'performance' | 'motion' | 'combat' | 'pose';
export interface Anim { id: string; name: string; file: string; category: Category }
export interface CategoryInfo { id: Category; label: string; emoji: string }

export const CATEGORIES = catalog.categories as CategoryInfo[];
export const ANIMS = catalog.animations as Anim[];
const byId = new Map(ANIMS.map((a) => [a.id, a]));

export const anim = (id: string): Anim | undefined => byId.get(id);
export const clipUrl = (id: string): string => `/anims/${byId.get(id)?.file ?? `${id}.glb`}`;
export const clipName = (id: string): string => byId.get(id)?.name ?? id;
export const clipsIn = (category: Category): string[] => ANIMS.filter((a) => a.category === category).map((a) => a.id);

/** Categories that hold or loop. Everything else runs once and hands back to the idle. */
const LOOPING: ReadonlySet<Category> = new Set(['idle', 'dance', 'motion', 'pose', 'performance']);
export const loops = (id: string): boolean => LOOPING.has(byId.get(id)?.category ?? 'emote');

/** How a clip drives the rig: idles are the base layer, everything else is an action on top of one. */
export const roleOf = (id: string): ClipRole => (byId.get(id)?.category === 'idle' ? 'idle' : 'action');

/** The clips that share a category with this one, for cycling with a click. */
export const siblingsOf = (id: string): string[] => { const c = byId.get(id)?.category; return c ? clipsIn(c) : [id]; };

/** Mood pools: what the body does on its own. One-shot clips in a pool play over the base idle, then hand back. */
export type Pool = 'greet' | 'work' | 'look' | 'dance';
export const BASE_IDLE = 'idle';
export const POOLS: Record<Pool, readonly string[]> = {
  greet: ['wave-hello', 'wave-hey', 'bow-1', 'bow-2'],
  // Presenting the projects: a bit of talk and reaction between calm idles, one per project as you move along.
  work: ['talking-1', 'thumbs-up', 'idle-6', 'look', 'talking-2', 'excited', 'chilling', 'talking-3', 'laughing', 'idle-7'],
  look: ['look-around', 'look-behind', 'look'],
  dance: clipsIn('dance'),
};

/** Pools whose clips loop as the base layer even when their category would run once (the world keeps looking around). */
export const LOOP_POOLS: ReadonlySet<Pool> = new Set(['look']);

/** Which pool the body should be in: dancing beats everything, the intro greets, the world looks around, the work presents. */
export function poolFor(mood: Mood, dancing: boolean): Pool {
  if (dancing) return 'dance';
  if (mood === 'me') return 'greet';
  return mood === 'world' ? 'look' : 'work';
}

export const nextIn = (pool: Pool, index: number, dir: 1 | -1 = 1): number => (index + dir + POOLS[pool].length) % POOLS[pool].length;
