import type {
  GroupOverviewItem,
  GroupOverviewSubscription,
  GroupReference,
  MaaSAuthPolicy,
  MaaSModelRefSummary,
  MaaSSubscription,
  ModelOverviewItem,
  ModelOverviewPolicy,
  ModelOverviewSubscription,
} from '~/app/types/subscriptions';

const modelKey = (namespace: string, name: string): string => `${namespace}/${name}`;

const groupNames = (refs: GroupReference[] | undefined): string[] | undefined => {
  if (!refs || refs.length === 0) {
    return undefined;
  }
  return refs.map((g) => g.name);
};

const toOverviewSubscription = (
  sub: MaaSSubscription,
  groups: string[] | undefined,
): ModelOverviewSubscription => ({
  name: sub.name,
  displayName: sub.displayName,
  phase: sub.phase,
  statusMessage: sub.statusMessage,
  reason: sub.reason,
  status: sub.status,
  conditionType: sub.conditionType,
  lastTransitionTime: sub.lastTransitionTime,
  groups,
  tokenRateLimits: [],
});

const toOverviewPolicy = (
  policy: MaaSAuthPolicy,
  groups: string[] | undefined,
): ModelOverviewPolicy => ({
  name: policy.name,
  displayName: policy.displayName,
  phase: policy.phase,
  statusMessage: policy.statusMessage,
  reason: policy.reason,
  status: policy.status,
  conditionType: policy.conditionType,
  lastTransitionTime: policy.lastTransitionTime,
  groups,
});

/**
 * Client-side join of MaaSModelRefs with subscriptions and auth policies.
 * Replaces the former GET /api/v1/overview/models BFF reshape.
 */
export const buildOverviewRows = (
  modelRefs: MaaSModelRefSummary[],
  subscriptions: MaaSSubscription[],
  policies: MaaSAuthPolicy[],
): ModelOverviewItem[] => {
  const subsByModel = new Map<string, ModelOverviewSubscription[]>();
  for (const sub of subscriptions) {
    const groups = groupNames(sub.owner.groups);
    for (const ref of sub.modelRefs) {
      const key = modelKey(ref.namespace, ref.name);
      const entry: ModelOverviewSubscription = {
        ...toOverviewSubscription(sub, groups),
        tokenRateLimits: [...ref.tokenRateLimits],
      };
      const existing = subsByModel.get(key);
      if (existing) {
        existing.push(entry);
      } else {
        subsByModel.set(key, [entry]);
      }
    }
  }

  const policiesByModel = new Map<string, ModelOverviewPolicy[]>();
  for (const policy of policies) {
    const groups = groupNames(policy.subjects.groups);
    for (const ref of policy.modelRefs) {
      const key = modelKey(ref.namespace, ref.name);
      const entry = toOverviewPolicy(policy, groups);
      const existing = policiesByModel.get(key);
      if (existing) {
        existing.push(entry);
      } else {
        policiesByModel.set(key, [entry]);
      }
    }
  }

  return modelRefs.map((ref) => {
    const key = modelKey(ref.namespace, ref.name);
    return {
      id: ref.name,
      namespace: ref.namespace,
      modelDetails: {
        displayName: ref.displayName,
        description: ref.description,
        phase: ref.phase,
        statusMessage: ref.statusMessage,
        reason: ref.reason,
        status: ref.status,
        conditionType: ref.conditionType,
        lastTransitionTime: ref.lastTransitionTime,
      },
      subscriptions: subsByModel.get(key) ?? [],
      authPolicies: policiesByModel.get(key) ?? [],
    };
  });
};

/**
 * Groups the subscriptions and auth policies by group name for the overview
 * groups view. Subscriptions keep their model refs so model/project filters
 * and affected-models lookups keep working per group.
 */
export const buildOverviewGroups = (
  subscriptions: MaaSSubscription[],
  policies: MaaSAuthPolicy[],
): GroupOverviewItem[] => {
  const groups = new Map<string, GroupOverviewItem>();
  const entry = (name: string): GroupOverviewItem => {
    let item = groups.get(name);
    if (!item) {
      item = { name, subscriptions: [], authPolicies: [] };
      groups.set(name, item);
    }
    return item;
  };

  for (const sub of subscriptions) {
    const subGroups = groupNames(sub.owner.groups);
    for (const group of subGroups ?? []) {
      const overviewSub: GroupOverviewSubscription = {
        ...toOverviewSubscription(sub, subGroups),
        modelRefs: sub.modelRefs,
      };
      entry(group).subscriptions.push(overviewSub);
    }
  }
  for (const policy of policies) {
    const policyGroups = groupNames(policy.subjects.groups);
    for (const group of policyGroups ?? []) {
      entry(group).authPolicies.push(toOverviewPolicy(policy, policyGroups));
    }
  }

  return [...groups.values()].toSorted((a, b) => a.name.localeCompare(b.name));
};
