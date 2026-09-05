import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import {
  profileSchema, projectSchema, roleSchema, educationSchema, skillGroupSchema,
  episodeSchema, ambientTrackSchema, placeSchema, creditSchema, copySchema,
} from './content/schema';

const yamlDir = (dir: string) => glob({ base: `./src/content/${dir}`, pattern: '*.yaml' });

export const collections = {
  profile: defineCollection({ loader: yamlDir('profile'), schema: profileSchema }),
  copy: defineCollection({ loader: yamlDir('copy'), schema: copySchema }),
  projects: defineCollection({ loader: yamlDir('projects'), schema: projectSchema }),
  roles: defineCollection({ loader: yamlDir('roles'), schema: roleSchema }),
  education: defineCollection({ loader: yamlDir('education'), schema: educationSchema }),
  places: defineCollection({ loader: yamlDir('places'), schema: placeSchema }),
  skills: defineCollection({ loader: file('./src/content/skills.yaml'), schema: skillGroupSchema }),
  ambient: defineCollection({ loader: file('./src/content/ambient.yaml'), schema: ambientTrackSchema }),
  credits: defineCollection({ loader: file('./src/content/credits.yaml'), schema: creditSchema }),
  episodes: defineCollection({ loader: file('./src/content/episodes.json'), schema: episodeSchema }),
};
