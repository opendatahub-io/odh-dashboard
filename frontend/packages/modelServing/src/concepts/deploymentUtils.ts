import { Deployment } from '../../extension-points';

export const deploymentNameSort = (a: Deployment, b: Deployment): number =>
  a.model.metadata?.name?.localeCompare(b.model.metadata?.name ?? '') ?? 0;
