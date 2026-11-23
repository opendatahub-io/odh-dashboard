import type {
  GroupReference,
  MaaSAuthPolicy,
  MaaSModelRefSummary,
  MaaSSubscription,
  ModelOverviewItem,
  ModelOverviewPolicy,
  ModelOverviewSubscription,
  TokenRateLimit,
} from '~/app/types/subscriptions';

const modelKey = (namespace: string, name: string): string => `${namespace}/${name}`;

const groupNames = (refs: GroupReference[] | undefined): string[] | undefined => {
  if (!refs || refs.length === 0) {
    return undefined;
  }
  return refs.map((g) => g.name);
};

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
      const rateLimits: TokenRateLimit[] = [...ref.tokenRateLimits];
      const key = modelKey(ref.namespace, ref.name);
      const entry: ModelOverviewSubscription = {
        name: sub.name,
        displayName: sub.displayName,
        phase: sub.phase,
        statusMessage: sub.statusMessage,
        reason: sub.reason,
        status: sub.status,
        conditionType: sub.conditionType,
        lastTransitionTime: sub.lastTransitionTime,
        groups,
        tokenRateLimits: rateLimits,
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
      const entry: ModelOverviewPolicy = {
        name: policy.name,
        displayName: policy.displayName,
        phase: policy.phase,
        statusMessage: policy.statusMessage,
        reason: policy.reason,
        status: policy.status,
        conditionType: policy.conditionType,
        lastTransitionTime: policy.lastTransitionTime,
        groups,
      };
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
