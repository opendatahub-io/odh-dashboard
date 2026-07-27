import { ClusterQueueKind } from '@odh-dashboard/internal/k8sTypes';
import { ContainerResourceAttributes } from '@odh-dashboard/k8s-core';
import parseK8sQuantity from './parseK8sQuantity';

type FlavorResourceUsage = {
  name: string;
  resources: {
    name: ContainerResourceAttributes;
    borrowed?: string | number;
    total?: string | number;
  }[];
};

const getTotalBorrowed = (flavorsUsage?: FlavorResourceUsage[]): number => {
  if (!flavorsUsage) {
    return 0;
  }
  return flavorsUsage.reduce(
    (total, flavor) =>
      total + flavor.resources.reduce((sum, r) => sum + parseK8sQuantity(r.borrowed), 0),
    0,
  );
};

export const isBorrowing = (cq: ClusterQueueKind): boolean =>
  getTotalBorrowed(cq.status?.flavorsUsage) > 0;

export const getBorrowedCount = (cq: ClusterQueueKind): number =>
  getTotalBorrowed(cq.status?.flavorsUsage);
