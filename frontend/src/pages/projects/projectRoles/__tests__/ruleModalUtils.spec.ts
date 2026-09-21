import { normalizeVerbs } from '#~/pages/projects/projectRoles/ruleModalUtils';

describe('normalizeVerbs', () => {
  it('should return individual verbs when wildcard is not present', () => {
    const verbs = ['get', 'list', 'watch'];
    expect(normalizeVerbs(verbs)).toEqual(['get', 'list', 'watch']);
  });

  it('should collapse to wildcard when wildcard is present', () => {
    const verbs = ['*', 'get', 'list'];
    expect(normalizeVerbs(verbs)).toEqual(['*']);
  });

  it('should return wildcard alone when only wildcard is selected', () => {
    expect(normalizeVerbs(['*'])).toEqual(['*']);
  });

  it('should return empty array for no verbs', () => {
    expect(normalizeVerbs([])).toEqual([]);
  });

  it('should return a copy, not the same reference', () => {
    const verbs = ['get', 'list'];
    const result = normalizeVerbs(verbs);
    expect(result).toEqual(verbs);
    expect(result).not.toBe(verbs);
  });
});
