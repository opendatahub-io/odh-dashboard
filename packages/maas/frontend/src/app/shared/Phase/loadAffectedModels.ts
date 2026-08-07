import { getPolicyInfo } from '~/app/api/auth-policies';
import { getSubscriptionInfo } from '~/app/api/subscriptions';
import {
  getAffectedModelsFromRefs,
  PhaseResourceType,
  PhaseStatus,
} from '~/app/utilities/phaseLabelUtils';
import type { AffectedModel } from './AffectedModelsTable';

export const AFFECTED_MODELS_FETCH_ERROR = 'Unable to fetch models. A Transient error occurred.';

export const loadAffectedModels = async (
  resourceType: PhaseResourceType,
  resourceId: string,
): Promise<AffectedModel[]> => {
  if (resourceType === PhaseResourceType.SUBSCRIPTION) {
    const info = await getSubscriptionInfo(resourceId)({});
    return getAffectedModelsFromRefs(info.subscription.modelRefs, info.modelRefs);
  }
  if (resourceType === PhaseResourceType.AUTHPOLICY) {
    const info = await getPolicyInfo(resourceId)({});
    return getAffectedModelsFromRefs(info.policy.modelRefs, info.modelRefs);
  }
  return [];
};

export const shouldFetchAffectedModels = (
  phase: string,
  resourceType: PhaseResourceType,
  affectedModels: AffectedModel[] | undefined,
  resourceId: string | undefined,
): resourceId is string =>
  phase === PhaseStatus.DEGRADED &&
  (resourceType === PhaseResourceType.SUBSCRIPTION ||
    resourceType === PhaseResourceType.AUTHPOLICY) &&
  affectedModels === undefined &&
  !!resourceId;
