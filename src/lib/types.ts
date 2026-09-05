export type Era = 'web3' | 'web2' | 'side';

export interface ProjectCard {
  id: string;
  title: string;
  kicker: string;
  meta: string;
  tags: string[];
  links: { label: string; url: string }[];
  paragraphs: string[];
  era: Era;
  image?: string;
  /** Clip the Meebit plays while this card is current. */
  pose?: string;
}
