import { LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import { ModelServingExtension } from '~/packages/modelServing/types';

export const trimForActiveServing = <T extends ModelServingExtension<string>>(
  extensions: LoadedExtension<T>[],
  availableServingPlatforms: string[],
): T[] =>
  extensions.filter(({ properties: { servingId } }) =>
    availableServingPlatforms.includes(servingId),
  );
