import { getEffectiveProjectNamespaces } from '~/app/hooks/useAgentOpsProjectNamespaces';

describe('getEffectiveProjectNamespaces', () => {
  const team1 = [{ name: 'team1', displayName: 'team1' }];

  it('returns project list when non-empty', () => {
    expect(getEffectiveProjectNamespaces(team1, false, 'fallback')).toEqual(team1);
    expect(getEffectiveProjectNamespaces(team1, true, 'fallback')).toEqual(team1);
  });

  it('synthesizes fallback namespace only while loading', () => {
    expect(getEffectiveProjectNamespaces([], true, 'team1')).toEqual([
      { name: 'team1', displayName: 'team1' },
    ]);
  });

  it('returns empty list when loaded with no projects', () => {
    expect(getEffectiveProjectNamespaces([], false, 'team1')).toEqual([]);
  });

  it('returns empty list when loaded with no fallback', () => {
    expect(getEffectiveProjectNamespaces([], false)).toEqual([]);
    expect(getEffectiveProjectNamespaces([], true)).toEqual([]);
  });
});
