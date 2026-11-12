import type { PolicyCategory } from '@/data/policies';

// Homepage "life need" topic cards, each mapped to real category filters in
// the actual catalogue (see src/data/policies.ts PolicyCategory) rather than
// invented groupings. Clicking a card links to /policies?category=<cat> for
// its first-listed category — PolicyBrowser also accepts a `categories`
// (comma-separated) query param so a single card can span more than one
// underlying category while still landing on real, filterable results.
export interface Topic {
  id: string;
  /** i18n message key suffix under `home.topics.<id>Title` / `<id>Desc` */
  categories: PolicyCategory[];
}

export const topics: Topic[] = [
  { id: 'welfare', categories: ['social-welfare'] },
  { id: 'jobs', categories: ['employment'] },
  { id: 'family', categories: ['family'] },
  { id: 'health', categories: ['health'] },
  { id: 'education', categories: ['education'] },
  { id: 'housing', categories: ['housing', 'consumer'] },
];

export function topicHref(topic: Topic): string {
  return `/policies?category=${topic.categories.join(',')}`;
}
