import { describe, expect, it } from 'vitest';
import { topics, topicHref } from './topics';
import { categories } from '@/data/policies';

describe('topics', () => {
  it('maps every topic category to a real PolicyCategory', () => {
    const validCategories = new Set(categories as readonly string[]);
    for (const topic of topics) {
      for (const category of topic.categories) {
        expect(validCategories.has(category)).toBe(true);
      }
    }
  });

  it('builds a comma-separated /policies?category= link', () => {
    expect(topicHref({ id: 'welfare', categories: ['social-welfare'] })).toBe(
      '/policies?category=social-welfare'
    );
    expect(topicHref({ id: 'housing', categories: ['housing', 'consumer'] })).toBe(
      '/policies?category=housing,consumer'
    );
  });

  it('has a unique id per topic', () => {
    const ids = topics.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
