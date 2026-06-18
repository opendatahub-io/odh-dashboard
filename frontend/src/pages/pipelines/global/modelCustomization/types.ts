import type { ContainerResources } from '@odh-dashboard/k8s-core';

export type ContainerSize = {
  name: string;
  resources: ContainerResources;
};
