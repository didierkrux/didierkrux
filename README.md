# didierkrux.com

Portfolio, world, and music for Didier Krux. Astro static site, one React island, deployed on Vercel.

## Develop

    pnpm install
    pnpm dev            # http://localhost:4321/work
    pnpm test           # unit tests (Vitest)
    pnpm test:e2e       # end-to-end (Playwright, builds first)
    pnpm check          # Astro type check

## Content

Everything you read on the site lives in `src/content/` as YAML. Edit a file, save, the dev server reloads. Schemas are in `src/content/schema.ts`; a bad field fails the build.

## Generated files (run locally, then commit)

    pnpm import:episodes   # reads ../digitalkrux/episodes into src/content/episodes.json
    pnpm resume:pdf        # prints /resume to public/Resume_Didier_Krux.pdf (2 or 3 full A4 pages)
    pnpm og:images         # screenshots social previews into public/og/

## Branches

`rebuild` is the new site (Vercel preview). `master` is production. `digitalkrux` is a separate site (digital.krux.co). The previous site is kept in `archive/2018-site/` and is not deployed.
