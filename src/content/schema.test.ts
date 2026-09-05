import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import {
  profileSchema, projectSchema, roleSchema, educationSchema, skillGroupSchema,
  episodeSchema, ambientTrackSchema, placeSchema, creditSchema, copySchema,
} from './schema';

const ROOT = join(process.cwd(), 'src/content');
const loadYamlDir = (dir: string) => {
  const full = join(ROOT, dir);
  if (!existsSync(full)) return [] as { id: string; data: unknown }[];
  return readdirSync(full).filter((f) => f.endsWith('.yaml')).map((f) => ({
    id: f.replace(/\.yaml$/, ''),
    data: yaml.load(readFileSync(join(full, f), 'utf8')),
  }));
};
const loadYamlFile = (file: string) => yaml.load(readFileSync(join(ROOT, file), 'utf8')) as unknown[];

describe('content collections validate', () => {
  it('profile', () => {
    const entries = loadYamlDir('profile');
    expect(entries.map((e) => e.id)).toEqual(['profile']);
    profileSchema.parse(entries[0].data);
  });
  it('copy', () => {
    const entries = loadYamlDir('copy');
    expect(entries.map((e) => e.id)).toEqual(['copy']);
    copySchema.parse(entries[0].data);
  });
  it('places', () => {
    const entries = loadYamlDir('places');
    expect(entries.length).toBe(4);
    for (const e of entries) placeSchema.parse(e.data);
  });
  it('roles, education, projects (may be empty before Tasks 4 and 5)', () => {
    for (const e of loadYamlDir('roles')) roleSchema.parse(e.data);
    for (const e of loadYamlDir('education')) educationSchema.parse(e.data);
    const roleIds = new Set(loadYamlDir('roles').map((r) => r.id));
    for (const e of loadYamlDir('projects')) {
      const p = projectSchema.parse(e.data);
      if (p.roleRef) expect(roleIds.has(p.roleRef), `${e.id}.roleRef -> ${p.roleRef}`).toBe(true);
    }
  });
  it('skills', () => { for (const s of loadYamlFile('skills.yaml')) skillGroupSchema.parse(s); });
  it('ambient', () => { for (const a of loadYamlFile('ambient.yaml')) ambientTrackSchema.parse(a); });
  it('credits', () => { for (const c of loadYamlFile('credits.yaml')) creditSchema.parse(c); });
  it('episodes', () => {
    const episodes = JSON.parse(readFileSync(join(ROOT, 'episodes.json'), 'utf8')) as unknown[];
    expect(episodes.length).toBeGreaterThanOrEqual(70);
    for (const ep of episodes) episodeSchema.parse(ep);
  });
  it('rejects a project with a bad date', () => {
    expect(() => projectSchema.parse({
      title: 'x', kicker: 'x', story: 'long enough story text here', role: 'x',
      dates: { start: '2024-13' }, status: 'live', era: 'web3', tags: ['a'],
    })).toThrow();
  });
});
