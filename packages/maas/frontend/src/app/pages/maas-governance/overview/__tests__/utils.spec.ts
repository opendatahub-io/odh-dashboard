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
  authPolicies: [
    { name: `${name}-policy`, displayName: `${name} Policy`, groups: [name], modelRefs: [] },
  ],
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

  it('should match model and project filters against authorization policy model refs', () => {
    const policyOnly: GroupOverviewItem = {
      name: 'policy-only-users',
      subscriptions: [],
      authPolicies: [
        {
          name: 'policy-only-policy',
          groups: ['policy-only-users'],
          modelRefs: [{ name: 'llama-3-70b', namespace: 'llama-ns' }],
        },
      ],
    };
    const all = [...groups, policyOnly];

    const byModel = filterOverviewGroups(all, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.modelName]: 'llama',
    });
    expect(byModel.map((g) => g.name)).toEqual(['policy-only-users']);

    const byProject = filterOverviewGroups(all, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.project]: 'llama-ns',
    });
    expect(byProject.map((g) => g.name)).toEqual(['policy-only-users']);
  });

  it('should return an empty array for empty input', () => {
    expect(filterOverviewGroups([], filters({}))).toEqual([]);
  });
});
