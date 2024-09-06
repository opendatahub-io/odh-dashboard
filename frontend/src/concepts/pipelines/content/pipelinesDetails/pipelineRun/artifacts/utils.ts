import { Artifact } from '~/third_party/mlmd';
import { ArtifactType } from '~/concepts/pipelines/kfTypes';
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

export const isMetricsArtifactType = (artifactType?: string): boolean =>
  artifactType === ArtifactType.METRICS ||
  artifactType === ArtifactType.CLASSIFICATION_METRICS ||
  artifactType === ArtifactType.HTML ||
  artifactType === ArtifactType.MARKDOWN ||
  artifactType === ArtifactType.SLICED_CLASSIFICATION_METRICS;
