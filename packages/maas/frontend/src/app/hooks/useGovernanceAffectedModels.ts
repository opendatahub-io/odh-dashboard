import * as React from 'react';
import { useMaaSGovernanceContext } from '~/app/context/MaaSGovernanceContext';
import type { AffectedModel } from '~/app/types/maas-model';
import type { MaaSAuthPolicy, MaaSSubscription } from '~/app/types/subscriptions';
import {
  getAffectedModelsFromRefs,
  normalizePhase,
  PhaseResourceType,
  PhaseStatus,
} from '~/app/utilities/phaseLabelUtils';

const isDegradedPhase = (phase: string | undefined): boolean =>
  normalizePhase(phase) === PhaseStatus.DEGRADED;

export const useSubscriptionAffectedModels = (
  subscription: Pick<MaaSSubscription, 'modelRefs' | 'phase'>,
): AffectedModel[] | undefined => {
  const { modelRefs, loaded } = useMaaSGovernanceContext();

  return React.useMemo(() => {
    if (!loaded || !isDegradedPhase(subscription.phase)) {
      return undefined;
    }
    return getAffectedModelsFromRefs(subscription.modelRefs, modelRefs);
  }, [loaded, subscription.modelRefs, subscription.phase, modelRefs]);
};

export const usePolicyAffectedModels = (
  policy: Pick<MaaSAuthPolicy, 'modelRefs' | 'phase'>,
): AffectedModel[] | undefined => {
  const { modelRefs, loaded } = useMaaSGovernanceContext();

  return React.useMemo(() => {
    if (!loaded || !isDegradedPhase(policy.phase)) {
      return undefined;
    }
    return getAffectedModelsFromRefs(policy.modelRefs, modelRefs);
  }, [loaded, policy.modelRefs, policy.phase, modelRefs]);
};

/** Resolve affected models by resource name when only overview summary fields are available. */
export const useGovernanceResourceAffectedModels = (
  name: string,
  phase: string | undefined,
  resourceType: PhaseResourceType,
): AffectedModel[] | undefined => {
  const { subscriptions, policies, modelRefs, loaded } = useMaaSGovernanceContext();

  return React.useMemo(() => {
    if (!loaded || !isDegradedPhase(phase)) {
      return undefined;
    }
    if (resourceType === PhaseResourceType.SUBSCRIPTION) {
      const subscription = subscriptions.find((s) => s.name === name);
      return subscription
        ? getAffectedModelsFromRefs(subscription.modelRefs, modelRefs)
        : undefined;
    }
    if (resourceType === PhaseResourceType.AUTHPOLICY) {
      const policy = policies.find((p) => p.name === name);
      return policy ? getAffectedModelsFromRefs(policy.modelRefs, modelRefs) : undefined;
    }
    return undefined;
  }, [loaded, name, phase, resourceType, subscriptions, policies, modelRefs]);
};
