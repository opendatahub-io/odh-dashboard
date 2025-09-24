import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { Deployment } from '../../extension-points';

const isDeploymentInactive = (deployment: Deployment): boolean =>
  deployment.model.metadata.annotations?.['serving.kserve.io/deploymentMode'] === 'Stopped';

export const deploymentNameSort = (a: Deployment, b: Deployment): number =>
  getDisplayNameFromK8sResource(a.model).localeCompare(getDisplayNameFromK8sResource(b.model));

export const deploymentLastDeployedSort = (a: Deployment, b: Deployment): number => {
  const getScore = (deployment: Deployment): number => {
    if (
      deployment.status?.state === ModelDeploymentState.LOADING ||
      deployment.status?.state === ModelDeploymentState.PENDING
    ) {
      return 2;
    }
    if (isDeploymentInactive(deployment)) {
      return 0;
    }
    return 1;
  };

  const aScore = getScore(a);
  const bScore = getScore(b);
  if (aScore !== bScore) {
    return bScore - aScore;
  }

  type Condition = {
    type: string;
    status: 'True' | 'False' | 'Unknown';
    lastTransitionTime: string;
  };

  const getConditions = (deployment: Deployment): Condition[] => {
    if (deployment.model.status && Array.isArray(deployment.model.status.conditions)) {
      return deployment.model.status.conditions;
    }
    return [];
  };

  const aReadyCondition = getConditions(a).find((c) => c.type === 'Ready');
  const bReadyCondition = getConditions(b).find((c) => c.type === 'Ready');

  const aTimestamp =
    aReadyCondition?.status === 'True'
      ? aReadyCondition.lastTransitionTime
      : a.model.metadata.creationTimestamp;
  const bTimestamp =
    bReadyCondition?.status === 'True'
      ? bReadyCondition.lastTransitionTime
      : b.model.metadata.creationTimestamp;

  return new Date(bTimestamp ?? '').getTime() - new Date(aTimestamp ?? '').getTime();
};
