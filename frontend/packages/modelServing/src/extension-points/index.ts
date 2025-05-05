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
