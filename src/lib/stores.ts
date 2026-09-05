import { atom } from 'nanostores';
import type { ThemePref } from './theme';

export type Page = 'home' | 'world';
export type Section = 'top' | 'web3' | 'web2' | 'projects';
export const SECTIONS: readonly Section[] = ['top', 'web3', 'web2', 'projects'];
export const JUMP_SECTIONS: readonly Exclude<Section, 'top'>[] = ['web3', 'web2', 'projects'];
export type Panel = 'none' | 'manual';
export type Mood = 'me' | 'work' | 'world';

export const page = atom<Page>('home');
export const section = atom<Section>('top');
export const itemIndex = atom<number>(0);
export const itemCount = atom<number>(1);
export const panel = atom<Panel>('none');
export const themePref = atom<ThemePref>('system');
export const systemDark = atom<boolean>(false);
export const dj = atom<boolean>(false);
export const playing = atom<boolean>(false);       // ambient music intent
export const track = atom<string>('');             // ambient track label
export const setPlaying = atom<string | null>(null); // title of the Digital Krux set on the deck, world only
export const progress = atom<{ current: number; duration: number }>({ current: 0, duration: 0 }); // of whatever is playing

export interface MeebitEntry { tokenId: number; vrm: string }
export const meebitList = atom<MeebitEntry[]>([]); // the Meebits Didier owns, from the profile
export const meebit = atom<number>(0); // token id on stage
export const itemPose = atom<string | null>(null); // the current project's own clip, from its card; null = the mood pool
export const manualClip = atom<{ id: string; nonce: number } | null>(null); // a pose picked by hand in the world; null = follow the mood
export const clipPlaying = atom<string>(''); // what the body does right now, published by the stage
export const poseStep = atom<{ dir: 1 | -1; n: number }>({ dir: 1, n: 0 }); // each change asks the stage for the next or previous pose

export function isSection(v: unknown): v is Section {
  return typeof v === 'string' && (SECTIONS as readonly string[]).includes(v);
}

export function moodFor(p: Page, s: Section): Mood {
  if (p === 'world') return 'world';
  return s === 'top' ? 'me' : 'work';
}
