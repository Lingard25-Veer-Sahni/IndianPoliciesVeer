import { describe, expect, it } from 'vitest';
import { appliesInState } from './StateLookup';
import type { Policy } from '@/data/policies';

// appliesInState backs the state-vs-national split required by the
// redesign spec: central policies must apply everywhere, state policies
// must apply ONLY in the states they explicitly list — never relabeled as
// national, never silently applied to a state that wasn't listed.
function makePolicy(overrides: Partial<Policy>): Policy {
  return {
    slug: 'test-policy',
    category: 'health',
    year: '2020',
    ministry: 'Test Ministry',
    officialSourceUrl: 'https://example.gov.in',
    officialSourceName: 'Example Source',
    keywords: [],
    content: {} as Policy['content'],
    ...overrides,
  };
}

describe('appliesInState', () => {
  it('applies a central policy to every state', () => {
    const policy = makePolicy({ applicability: 'central' });
    expect(appliesInState(policy, 'maharashtra')).toBe(true);
    expect(appliesInState(policy, 'kerala')).toBe(true);
  });

  it('applies a policy with no applicability field to every state (default = national)', () => {
    const policy = makePolicy({});
    expect(appliesInState(policy, 'maharashtra')).toBe(true);
  });

  it('applies a state policy only to the states it explicitly lists', () => {
    const policy = makePolicy({ applicability: 'state', states: ['maharashtra', 'goa'] });
    expect(appliesInState(policy, 'maharashtra')).toBe(true);
    expect(appliesInState(policy, 'goa')).toBe(true);
    expect(appliesInState(policy, 'kerala')).toBe(false);
  });

  it('a state policy with no states listed applies nowhere (honest no-coverage, never a silent fallback)', () => {
    const policy = makePolicy({ applicability: 'state' });
    expect(appliesInState(policy, 'maharashtra')).toBe(false);
  });
});
