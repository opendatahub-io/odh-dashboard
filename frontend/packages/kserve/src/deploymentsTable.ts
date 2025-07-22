import * as React from 'react';
import type { DeploymentsTableColumn } from '@odh-dashboard/model-serving/extension-points';
import InferenceServiceServingRuntime from '@odh-dashboard/internal/pages/modelServing/screens/global/InferenceServiceServingRuntime';
import { KServeDeployment } from './deployments';

export const columns = (): DeploymentsTableColumn<KServeDeployment>[] => [
  {
    field: 'servingRuntime',
    label: 'Serving runtime',
    sortable: false,
    cellRenderer: (deployment: KServeDeployment) =>
      React.createElement(InferenceServiceServingRuntime, { servingRuntime: deployment.server }),
  },
];
