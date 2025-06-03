import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils.js';
import { Deployment } from '../../extension-points';

export const deploymentNameSort = (a: Deployment, b: Deployment): number =>
  getDisplayNameFromK8sResource(a.model).localeCompare(getDisplayNameFromK8sResource(b.model));
