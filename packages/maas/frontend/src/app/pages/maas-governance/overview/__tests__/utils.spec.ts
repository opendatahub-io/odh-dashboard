import { GroupOverviewItem } from '~/app/types/subscriptions';
import {
  initialOverviewFilterData,
  OverviewFilterDataType,
  OverviewFilterOptions,
} from '~/app/pages/maas-governance/overview/const';
import { filterOverviewGroups } from '~/app/pages/maas-governance/overview/utils';

const filters = (partial: Partial<OverviewFilterDataType>): OverviewFilterDataType => ({
  ...initialOverviewFilterData,
  ...partial,
});

const group = (name: string, overrides?: Partial<GroupOverviewItem>): GroupOverviewItem => ({
  name,
  subscriptions: [
    {
      name: `${name}-sub`,
      displayName: `${name} Subscription`,
      groups: [name],
      modelRefs: [{ name: 'granite-3-8b-instruct', namespace: 'maas-models', tokenRateLimits: [] }],
    },
  ],
  authPolicies: [{ name: `${name}-policy`, displayName: `${name} Policy`, groups: [name] }],
  ...overrides,
});

const groups = [group('alpha-users'), group('beta-users'), group('gamma-users')];

describe('filterOverviewGroups', () => {
  it('should return all groups when no filters are set', () => {
    expect(filterOverviewGroups(groups, filters({}))).toHaveLength(3);
  });

  it('should filter by exact group name selection', () => {
    const filtered = filterOverviewGroups(groups, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.groupName]: { label: 'Alpha', value: 'alpha-users' },
    });
    expect(filtered.map((g) => g.name)).toEqual(['alpha-users']);
  });

  it('should filter by group name fragment', () => {
    const filtered = filterOverviewGroups(groups, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.groupName]: 'beta',
    });
    expect(filtered.map((g) => g.name)).toEqual(['beta-users']);
  });

  it('should filter by subscription name fragment', () => {
    const filtered = filterOverviewGroups(groups, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.subscriptionName]: 'gamma',
    });
    expect(filtered.map((g) => g.name)).toEqual(['gamma-users']);
  });

  it('should filter by authorization policy name fragment', () => {
    const filtered = filterOverviewGroups(groups, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.authPolicyName]: 'alpha',
    });
    expect(filtered.map((g) => g.name)).toEqual(['alpha-users']);
  });

  it('should filter by model name', () => {
    const filtered = filterOverviewGroups(groups, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.modelName]: 'granite',
    });
    expect(filtered).toHaveLength(3);
    const none = filterOverviewGroups(groups, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.modelName]: 'nonexistent',
    });
    expect(none).toHaveLength(0);
  });

  it('should filter by project', () => {
    const filtered = filterOverviewGroups(groups, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.project]: 'maas-models',
    });
    expect(filtered).toHaveLength(3);
    const none = filterOverviewGroups(groups, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.project]: 'other-ns',
    });
    expect(none).toHaveLength(0);
  });

  it('should return an empty array for empty input', () => {
    expect(filterOverviewGroups([], filters({}))).toEqual([]);
  });
});
