import { Artifact } from '~/third_party/mlmd';
import { ArtifactProperty } from './types';

export const getArtifactProperties = (artifact: Artifact): ArtifactProperty[] =>
  artifact
    .toObject()
    .customPropertiesMap.reduce(
      (
        acc: { name: string; value: string }[],
        [customPropKey, { stringValue, intValue, doubleValue, boolValue }],
      ) => {
        if (customPropKey !== 'display_name') {
          acc.push({
            name: customPropKey,
            value: stringValue || (intValue || doubleValue || boolValue).toString(),
          });
        }

        return acc;
      },
      [],
    );
