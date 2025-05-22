import { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
// eslint-disable-next-line import/no-extraneous-dependencies
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
// eslint-disable-next-line import/no-extraneous-dependencies
import { SortableData } from '@odh-dashboard/internal/components/table/types';
// eslint-disable-next-line import/no-extraneous-dependencies
import { K8sAPIOptions, ProjectKind } from '@odh-dashboard/internal/k8sTypes';

//// Model serving platform extension

export type Deployment<
  M extends K8sResourceCommon = K8sResourceCommon,
  S extends K8sResourceCommon = K8sResourceCommon,
> = {
  modelServingPlatformId: string;
  model: M;
  server?: S;
  status?: {
    state?: string;
    message?: string;
  };
};

export type ModelServingPlatformExtension<D extends Deployment = Deployment> = Extension<
  'model-serving.platform',
  {
    id: string;
    manage: {
      namespaceApplicationCase: NamespaceApplicationCase;
      enabledLabel: string;
      enabledLabelValue: string;
    };
    deployments: {
      watch: CodeRef<
        (
          project: ProjectKind,
          opts?: K8sAPIOptions,
        ) => [D[] | undefined, boolean, Error | undefined]
      >;
    };
    enableCardText: {
      title: string;
      description: string;
      selectText: string;
      enabledText: string;
    };
    deployedModelsView: {
      startHintTitle: string;
      startHintDescription: string;
      deployButtonText: string;
    };
  }
>;
export const isModelServingPlatformExtension = (
  extension: Extension,
): extension is ModelServingPlatformExtension => extension.type === 'model-serving.platform';

// Model serving deployments table extension

export type DeploymentsTableColumn<D extends Deployment = Deployment> = SortableData<D> & {
  cellRenderer: (deployment: D, column: string) => string;
};

export type ModelServingDeploymentsTableExtension<D extends Deployment = Deployment> = Extension<
  'model-serving.deployments-table',
  {
    platform: string;
    columns: CodeRef<() => DeploymentsTableColumn<D>[]>;
  }
>;
export const isModelServingDeploymentsTableExtension = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingDeploymentsTableExtension<D> =>
  extension.type === 'model-serving.deployments-table';
