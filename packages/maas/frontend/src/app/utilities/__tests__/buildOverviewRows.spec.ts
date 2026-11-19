import { buildOverviewRows } from '~/app/utilities/buildOverviewRows';
import type {
  MaaSAuthPolicy,
  MaaSModelRefSummary,
  MaaSSubscription,
} from '~/app/types/subscriptions';

const modelRefs: MaaSModelRefSummary[] = [
  {
    name: 'granite-3-8b-instruct',
    namespace: 'maas-models',
    displayName: 'Granite 3 8B Instruct',
    description: 'IBM Granite model',
    phase: 'Ready',
    modelRef: { kind: 'InferenceService', name: 'granite-3-8b-instruct' },
  },
  {
    name: 'flan-t5-small',
    namespace: 'maas-models',
    displayName: 'Flan T5 Small',
    phase: 'Ready',
    modelRef: { kind: 'InferenceService', name: 'flan-t5-small' },
  },
  {
    name: 'orphan-model',
    namespace: 'maas-models',
    displayName: 'Orphan',
    modelRef: { kind: 'InferenceService', name: 'orphan-model' },
  },
];

const subscriptions: MaaSSubscription[] = [
  {
    name: 'premium-team-sub',
    namespace: 'maas-system',
    displayName: 'Premium Team',
    phase: 'Active',
    statusMessage: 'Active subscription',
    owner: { groups: [{ name: 'premium-users' }] },
    modelRefs: [
      {
        name: 'granite-3-8b-instruct',
        namespace: 'maas-models',
        tokenRateLimits: [{ limit: 100000, window: '24h' }],
      },
      {
        name: 'flan-t5-small',
        namespace: 'maas-models',
        tokenRateLimits: [{ limit: 200000, window: '24h' }],
      },
    ],
  },
];

const policies: MaaSAuthPolicy[] = [
  {
    name: 'premium-team-sub-policy',
    namespace: 'maas-system',
    displayName: 'Premium Team Policy',
    phase: 'Active',
    statusMessage: 'Active policy',
    modelRefs: [
      { name: 'granite-3-8b-instruct', namespace: 'maas-models' },
      { name: 'flan-t5-small', namespace: 'maas-models' },
    ],
    subjects: { groups: [{ name: 'premium-users' }] },
  },
];

describe('buildOverviewRows', () => {
  it('should produce one row per model ref', () => {
    const rows = buildOverviewRows(modelRefs, subscriptions, policies);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.id)).toEqual([
      'granite-3-8b-instruct',
      'flan-t5-small',
      'orphan-model',
    ]);
  });

  it('should attach matching subscriptions and policies with groups and rate limits', () => {
    const rows = buildOverviewRows(modelRefs, subscriptions, policies);
    const granite = rows.find((r) => r.id === 'granite-3-8b-instruct');
    expect(granite).toBeDefined();
    expect(granite?.modelDetails).toEqual({
      displayName: 'Granite 3 8B Instruct',
      description: 'IBM Granite model',
      phase: 'Ready',
      statusMessage: undefined,
      reason: undefined,
      status: undefined,
      conditionType: undefined,
      lastTransitionTime: undefined,
    });
    expect(granite?.subscriptions).toEqual([
      {
        name: 'premium-team-sub',
        displayName: 'Premium Team',
        phase: 'Active',
        statusMessage: 'Active subscription',
        reason: undefined,
        status: undefined,
        conditionType: undefined,
        lastTransitionTime: undefined,
        groups: ['premium-users'],
        tokenRateLimits: [{ limit: 100000, window: '24h' }],
      },
    ]);
    expect(granite?.authPolicies).toEqual([
      {
        name: 'premium-team-sub-policy',
        displayName: 'Premium Team Policy',
        phase: 'Active',
        statusMessage: 'Active policy',
        reason: undefined,
        status: undefined,
        conditionType: undefined,
        lastTransitionTime: undefined,
        groups: ['premium-users'],
      },
    ]);
  });

  it('should return empty arrays for models with no subscriptions or policies', () => {
    const rows = buildOverviewRows(modelRefs, subscriptions, policies);
    const orphan = rows.find((r) => r.id === 'orphan-model');
    expect(orphan?.subscriptions).toEqual([]);
    expect(orphan?.authPolicies).toEqual([]);
  });

  it('should match models by namespace and name', () => {
    const otherNsSubs: MaaSSubscription[] = [
      {
        name: 'other-sub',
        namespace: 'maas-system',
        owner: { groups: [] },
        modelRefs: [
          {
            name: 'granite-3-8b-instruct',
            namespace: 'other-ns',
            tokenRateLimits: [],
          },
        ],
      },
    ];
    const rows = buildOverviewRows(modelRefs, otherNsSubs, []);
    const granite = rows.find((r) => r.id === 'granite-3-8b-instruct');
    expect(granite?.subscriptions).toEqual([]);
  });
});
