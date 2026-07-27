import type { Connection } from '@odh-dashboard/k8s-core';

export type LabeledConnection = {
  connection: Connection;
  isRecommended?: boolean;
};
