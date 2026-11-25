import { GroupOverviewItem, ModelOverviewItem } from '~/app/types/subscriptions';
import {
  initialOverviewFilterData,
  OverviewFilterDataType,
  OverviewFilterOptions,
} from '~/app/pages/maas-governance/overview/const';
import {
  filterOverviewGroups,
  filterOverviewModels,
} from '~/app/pages/maas-governance/overview/utils';

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

  it('should distinguish groups that differ only by case on exact selection', () => {
    const caseGroups = [group('Team'), group('team')];
    const filtered = filterOverviewGroups(caseGroups, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.groupName]: { label: 'Team', value: 'Team' },
    });
    expect(filtered.map((g) => g.name)).toEqual(['Team']);
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

  it('should match a model fragment against the model description', () => {
    const describedGroups: GroupOverviewItem[] = [
      {
        name: 'desc-users',
        subscriptions: [
          {
            name: 'desc-sub',
            groups: ['desc-users'],
            modelRefs: [
              {
                name: 'granite-3-8b-instruct',
                namespace: 'maas-models',
                displayName: 'Granite 3 8B',
                description: 'A compact instruct model',
                tokenRateLimits: [],
              },
            ],
          },
        ],
        authPolicies: [],
      },
    ];

    const byDescription = filterOverviewGroups(describedGroups, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.modelName]: 'compact instruct',
    });
    expect(byDescription.map((g) => g.name)).toEqual(['desc-users']);

    const none = filterOverviewGroups(describedGroups, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.modelName]: 'nonexistent description',
    });
    expect(none).toHaveLength(0);
  });

  it('should return an empty array for empty input', () => {
    expect(filterOverviewGroups([], filters({}))).toEqual([]);
  });
});

describe('filterOverviewModels', () => {
  const modelRow = (id: string, displayName: string): ModelOverviewItem => ({
    id,
    namespace: 'maas-models',
    modelDetails: { displayName } as ModelOverviewItem['modelDetails'],
    subscriptions: [],
    authPolicies: [],
  });

  const modelRows = [modelRow('granite-3-8b-instruct', 'Granite 3 8B')];

  it('should match an exact model selection only against the resource id', () => {
    const filtered = filterOverviewModels(modelRows, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.modelName]: { label: 'Granite 3 8B', value: 'granite-3-8b-instruct' },
    });
    expect(filtered.map((r) => r.id)).toEqual(['granite-3-8b-instruct']);

    const byDisplayName = filterOverviewModels(modelRows, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.modelName]: { label: 'Granite 3 8B', value: 'Granite 3 8B' },
    });
    expect(byDisplayName).toEqual([]);
  });

  it('should match a model name fragment against the display name', () => {
    const filtered = filterOverviewModels(modelRows, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.modelName]: 'granite 3',
    });
    expect(filtered.map((r) => r.id)).toEqual(['granite-3-8b-instruct']);
  });

  it('should match a model name fragment against the description', () => {
    const rows: ModelOverviewItem[] = [
      {
        id: 'granite-3-8b-instruct',
        namespace: 'maas-models',
        modelDetails: {
          displayName: 'Granite 3 8B',
          description: 'A compact instruct model',
        } as ModelOverviewItem['modelDetails'],
        subscriptions: [],
        authPolicies: [],
      },
    ];

    const filtered = filterOverviewModels(rows, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.modelName]: 'compact instruct',
    });
    expect(filtered.map((r) => r.id)).toEqual(['granite-3-8b-instruct']);
  });
});
