import { Extension } from '@openshift/dynamic-plugin-sdk';

export type ModelServingPlatform = Extension<
  'app.model-serving/platform',
  {
    id: string;
    name: string;
  }
>;
export const isModelServingPlatform = (extension: Extension): extension is ModelServingPlatform =>
  extension.type === 'app.model-serving/platform';
