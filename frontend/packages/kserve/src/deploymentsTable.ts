import type { DeploymentsTableColumn } from '@odh-dashboard/model-serving/extension-points';
import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { InferenceServiceModel } from '@odh-dashboard/internal/api/models/kserve';
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

export const patchDeploymentStoppedStatus = (
  deployment: KServeDeployment,
  isStopped: boolean,
): Promise<KServeDeployment['model']> =>
  k8sPatchResource({
    model: InferenceServiceModel,
    queryOptions: {
      name: deployment.model.metadata.name,
      ns: deployment.model.metadata.namespace,
    },
    patches: [
      {
        op: 'add',
        path: '/metadata/annotations/serving.kserve.io~1stop',
        value: isStopped ? 'true' : 'false',
      },
    ],
  });
