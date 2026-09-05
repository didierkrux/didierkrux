import { isSection, type Page, type Section } from './stores';

export function parsePage(pathname: string): Page | null {
  const seg = pathname.replace(/\/+$/, '').split('/').pop() ?? '';
  if (seg === '') return 'home';
  if (seg === 'world') return 'world';
  return null;
}

export function sectionFromHash(hash: string): Section {
  const h = hash.replace(/^#/, '');
  return isSection(h) ? h : 'top';
}

export function pageUrl(p: Page): string {
  return p === 'home' ? '/' : `/${p}`;
}
