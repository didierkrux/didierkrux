import { z } from 'astro/zod';

export const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'use YYYY-MM');
export const yearOrMonth = z.string().regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, 'use YYYY or YYYY-MM');

export const dateRangeSchema = z.object({
  start: yearMonth,
  end: yearMonth.optional(), // omitted means present
});

export const linkSchema = z.object({
  label: z.string().min(1),
  url: z.url(),
});

export const signColor = z.enum(['blue', 'magenta', 'cyan', 'lilac', 'emerald']);

export const worldSchema = z.object({
  piece: z.string().optional(),
  height: z.union([z.literal('auto'), z.number().int().min(1).max(40)]).default('auto'),
  footprint: z.enum(['s', 'm', 'l']).default('m'),
  sign: signColor.default('lilac'),
});

export const projectSchema = z.object({
  title: z.string().min(1),
  kicker: z.string().min(1).max(90),
  story: z.string().min(20),
  role: z.string().min(1),
  dates: dateRangeSchema,
  status: z.enum(['live', 'archived', 'hackathon']),
  era: z.enum(['web3', 'web2', 'side']),
  tags: z.array(z.string().min(1)).min(1).max(16),
  links: z.array(linkSchema).default([]),
  screenshots: z.array(z.string()).default([]),
  resume: z.string().max(220).optional(),
  roleRef: z.string().optional(),
  order: z.number().int().min(1).optional(),
  world: worldSchema.default({ height: 'auto', footprint: 'm', sign: 'lilac' }),
});

export const roleSchema = z.object({
  employer: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['employee', 'contract', 'founder', 'volunteer', 'internship', 'training']),
  dates: dateRangeSchema,
  location: z.string().min(1),
  remote: z.boolean().default(false),
  summary: z.string().min(20),
  highlights: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1)).default([]),
  links: z.array(linkSchema).default([]),
  order: z.number().int().min(1).optional(),
});

export const educationSchema = z.object({
  school: z.string().min(1),
  degree: z.string().min(1),
  dates: z.object({ start: yearOrMonth, end: yearOrMonth.optional() }),
  location: z.string().min(1),
  notes: z.string().optional(),
  tags: z.array(z.string().min(1)).default([]),
});

export const skillGroupSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
});

export const episodeSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().min(1),
  title: z.string().min(1),
  date: z.iso.datetime(),
  cover: z.url().nullable(),
  audio: z.url(),
  tracklist: z.array(z.string()),
});

export const ambientTrackSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().min(1),
  source: z.url(),
  file: z.string().min(1),
  mood: z.enum(['calm', 'up']),
  order: z.number().int().min(1),
});

export const placeSchema = z.object({
  label: z.string().min(1),
  order: z.number().int().min(0),
  piece: z.string().min(1),
  built: z.boolean().default(false),
});

export const creditSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  author: z.string().min(1),
  license: z.string().min(1),
  url: z.url(),
  usedFor: z.string().min(1),
});

export const copySchema = z.object({
  site: z.object({ name: z.string(), tagline: z.string(), description: z.string().max(160) }),
  hero: z.object({
    home: z.object({ title: z.string(), sub: z.string() }),
    world: z.object({ title: z.string(), sub: z.string() }),
  }),
  sections: z.object({ web3: z.string(), web2: z.string(), projects: z.string(), world: z.string() }),
  sectionIntros: z.object({ web3: z.string(), web2: z.string(), projects: z.string() }),
  work: z.object({ techLabel: z.string() }),
  manual: z.object({ title: z.string(), intro: z.string(), gestures: z.array(z.string()).min(1), close: z.string(), creditsTitle: z.string(), stageTitle: z.string(), stage: z.array(z.string()) }),
  world: z.object({ enter: z.string(), hardHat: z.string(), fence: z.string(), open: z.string(), back: z.string(), placesTitle: z.string(), boothTitle: z.string(), boothIntro: z.string(), deckSets: z.string(), deckSetsIntro: z.string(), deckAlbum: z.string(), deckAlbumIntro: z.string(), posesTitle: z.string(), posesIntro: z.string(), posesAuto: z.string() }),
  music: z.object({ play: z.string(), pause: z.string(), nextTrack: z.string(), prevTrack: z.string(), seek: z.string(), attribution: z.string() }),
  me: z.object({ linksTitle: z.string(), resumeCta: z.string() }),
  a11y: z.object({ skip: z.string(), stageAlt: z.string(), tabsLabel: z.string(), keyBarLabel: z.string() }),
  meebits: z.object({ swap: z.string(), prev: z.string(), next: z.string(), pose: z.string() }),
  notFound: z.object({ title: z.string(), sub: z.string() }),
});

export const profileSchema = z.object({
  name: z.string().min(1),
  headline: z.string().max(80),
  resumeHeadline: z.string().max(80),
  bio: z.string().min(40),
  nationality: z.string().min(1),
  location: z.string().min(1),
  languages: z.array(z.object({ name: z.string(), level: z.string() })).min(1),
  personal: z.array(z.string().min(1)).default([]),
  links: z.array(linkSchema.extend({ key: z.string().min(1) })).min(1),
  meebits: z.array(z.object({ tokenId: z.number().int(), vrm: z.string().min(1) })).min(1),
  meebitStill: z.string().min(1),
  meebitLicense: z.string().min(1),
});

export type Project = z.infer<typeof projectSchema>;
export type Role = z.infer<typeof roleSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Copy = z.infer<typeof copySchema>;
export type Episode = z.infer<typeof episodeSchema>;
export type Place = z.infer<typeof placeSchema>;
export type Credit = z.infer<typeof creditSchema>;
