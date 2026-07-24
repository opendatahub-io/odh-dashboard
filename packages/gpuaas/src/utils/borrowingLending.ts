import { ClusterQueueKind, ContainerResourceAttributes } from '@odh-dashboard/k8s-core';
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

const getNominalQuota = (cq: ClusterQueueKind): number => {
  if (!cq.spec.resourceGroups) {
    return 0;
  }
  return cq.spec.resourceGroups.reduce(
    (total, rg) =>
      total +
      rg.flavors.reduce(
        (sum, f) => sum + f.resources.reduce((s, r) => s + parseK8sQuantity(r.nominalQuota), 0),
        0,
      ),
    0,
  );
};

const getTotalUsage = (flavorsUsage?: FlavorResourceUsage[]): number => {
  if (!flavorsUsage) {
    return 0;
  }
  return flavorsUsage.reduce(
    (total, flavor) =>
      total + flavor.resources.reduce((sum, r) => sum + parseK8sQuantity(r.total), 0),
    0,
  );
};

export const isBorrowing = (cq: ClusterQueueKind): boolean =>
  getTotalBorrowed(cq.status?.flavorsUsage) > 0;

export const isLending = (cq: ClusterQueueKind): boolean => {
  const nominal = getNominalQuota(cq);
  const usage = getTotalUsage(cq.status?.flavorsUsage);
  return nominal > 0 && usage < nominal;
};

export const getBorrowedCount = (cq: ClusterQueueKind): number =>
  getTotalBorrowed(cq.status?.flavorsUsage);

export const getLentCount = (cq: ClusterQueueKind): number => {
  const nominal = getNominalQuota(cq);
  const usage = getTotalUsage(cq.status?.flavorsUsage);
  return Math.max(0, nominal - usage);
};
