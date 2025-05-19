// eslint-disable-next-line import/no-extraneous-dependencies
import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { Deployment } from '@odh-dashboard/model-serving/extension-points';
import { isKServeDeployment } from './deployments';

export const columns = (): SortableData<Deployment>[] => [
  {
    field: 'servingRuntime',
    label: 'Serving runtime',
    sortable: false,
  },
];

export const cellRenderer = (deployment: Deployment, column: string): string => {
  if (isKServeDeployment(deployment)) {
    if (column === 'servingRuntime') {
      return (
        deployment.server?.metadata.annotations?.['opendatahub.io/template-display-name'] ?? '-'
      );
    }
  }
  return '-';
};
