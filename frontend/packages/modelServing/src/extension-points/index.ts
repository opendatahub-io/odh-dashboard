import { Extension } from '@openshift/dynamic-plugin-sdk';

export type ModelServingPlatform = Extension<
  'model-serving.platform',
  {
    id: string;
    name: string;
  }
>;
export const isModelServingPlatform = (extension: Extension): extension is ModelServingPlatform =>
  extension.type === 'model-serving.platform';

export type ModelServingPlatformCard = Extension<
  'model-serving.platform/card',
  {
    platform: string;
    title: string;
    description: string;
    selectText: string;
  }
>;
export const isModelServingPlatformCard =
  (platform?: string) =>
  (extension: Extension): extension is ModelServingPlatformCard =>
    extension.type === 'model-serving.platform/card' &&
    (platform ? extension.properties.platform === platform : true);

export type ModelServingDeployedModel = Extension<
  'model-serving.platform/deployed-model',
  {
    platform: string;
    resourceName: string;
    displayName: string;
    namespace: string;
  }
>;

export const isModelServingDeployedModel =
  (platform?: string) =>
  (extension: Extension): extension is ModelServingDeployedModel =>
    extension.type === 'model-serving.platform/deployed-model' &&
    (platform ? extension.properties.platform === platform : true);

export type ModelServingDeleteModal = Extension<
  'model-serving.platform/delete-modal',
  {
    platform: string;
    onDelete: (deployedModel: ModelServingDeployedModel) => Promise<void>;
    title: string;
    submitButtonLabel: string;
  }
>;

export const isModelServingDeleteModal =
  (platform?: string) =>
  (extension: Extension): extension is ModelServingDeleteModal =>
    extension.type === 'model-serving.platform/delete-modal' &&
    (platform ? extension.properties.platform === platform : true);
