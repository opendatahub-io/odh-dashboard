import type { DeploymentsTableColumn } from '@odh-dashboard/model-serving/extension-points';
import { KServeDeployment } from './deployments';

export const columns = (): DeploymentsTableColumn<KServeDeployment>[] => [
  {
    field: 'servingRuntime',
    label: 'Serving runtime',
    sortable: false,
    cellRenderer: (deployment: KServeDeployment) =>
      deployment.server?.metadata.annotations?.['opendatahub.io/template-display-name'] ?? '-',
  },
];
