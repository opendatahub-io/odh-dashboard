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

export type GovernanceAffectedModelsState = {
  affectedModels: AffectedModel[] | undefined;
  overviewLoaded: boolean;
};

const isDegradedPhase = (phase: string | undefined): boolean =>
  normalizePhase(phase) === PhaseStatus.DEGRADED;

export const useSubscriptionAffectedModels = (
  subscription: Pick<MaaSSubscription, 'modelRefs' | 'phase'>,
): GovernanceAffectedModelsState => {
  const { modelRefs, overviewLoaded } = useMaaSGovernanceContext();

  const affectedModels = React.useMemo(() => {
    if (!overviewLoaded || !isDegradedPhase(subscription.phase)) {
      return undefined;
    }
    return getAffectedModelsFromRefs(subscription.modelRefs, modelRefs);
  }, [overviewLoaded, subscription.modelRefs, subscription.phase, modelRefs]);

  return { affectedModels, overviewLoaded };
};

export const usePolicyAffectedModels = (
  policy: Pick<MaaSAuthPolicy, 'modelRefs' | 'phase'>,
): GovernanceAffectedModelsState => {
  const { modelRefs, overviewLoaded } = useMaaSGovernanceContext();

  const affectedModels = React.useMemo(() => {
    if (!overviewLoaded || !isDegradedPhase(policy.phase)) {
      return undefined;
    }
    return getAffectedModelsFromRefs(policy.modelRefs, modelRefs);
  }, [overviewLoaded, policy.modelRefs, policy.phase, modelRefs]);

  return { affectedModels, overviewLoaded };
};

/** Resolve affected models by resource name when only overview summary fields are available. */
export const useGovernanceResourceAffectedModels = (
  name: string,
  phase: string | undefined,
  resourceType: PhaseResourceType,
): GovernanceAffectedModelsState => {
  const { subscriptions, policies, modelRefs, overviewLoaded } = useMaaSGovernanceContext();

  const affectedModels = React.useMemo(() => {
    if (!overviewLoaded || !isDegradedPhase(phase)) {
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
  }, [overviewLoaded, name, phase, resourceType, subscriptions, policies, modelRefs]);

  return { affectedModels, overviewLoaded };
};
