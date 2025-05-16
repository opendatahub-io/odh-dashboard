import { Extension } from '@openshift/dynamic-plugin-sdk';
// eslint-disable-next-line import/no-extraneous-dependencies
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
// eslint-disable-next-line import/no-extraneous-dependencies
import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { ModelServingPlatform } from 'concepts/modelServingPlatforms';

//// Types for the model serving platform extension

export type Deployment<T extends K8sResourceCommon = K8sResourceCommon> = {
  model: T;
};

//// Extension points

export type ModelServingPlatformExtension = Extension<
  'model-serving.platform',
  {
    id: string;
    manage: {
      namespaceApplicationCase: NamespaceApplicationCase;
      enabledLabel: string;
      enabledLabelValue: string;
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

export type ModelServingDeploymentsTableExtension = Extension<
  'model-serving.deployments-table',
  {
    platform: string;
    columns: SortableData<Deployment>[];
  }
>;
export const isModelServingDeploymentsTableExtension =
  (platform?: ModelServingPlatform) =>
  (extension: Extension): extension is ModelServingDeploymentsTableExtension =>
    extension.type === 'model-serving.deployments-table' &&
    (platform ? extension.properties.platform === platform.properties.id : true);
