import { Artifact } from '#~/third_party/mlmd';
import { ArtifactType } from '#~/concepts/pipelines/kfTypes';
import { ArtifactProperty, PipelineRunArtifactModelData } from './types';

export const getArtifactProperties = (artifact: Artifact): ArtifactProperty[] =>
  artifact
    .toObject()
    .customPropertiesMap.reduce(
      (
        acc: { name: string; value: string }[],
        [customPropKey, { stringValue, intValue, doubleValue, boolValue }],
      ) => {
        if (customPropKey !== 'display_name' && customPropKey !== 'store_session_info') {
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

export const getArtifactModelData = (artifact?: Artifact): PipelineRunArtifactModelData => {
  if (!artifact) {
    return {};
  }

  return {
    registeredModelName: artifact
      .getCustomPropertiesMap()
      .get('registeredModelName')
      ?.getStringValue(),
    modelRegistryName: artifact.getCustomPropertiesMap().get('modelRegistryName')?.getStringValue(),
    modelVersionName: artifact.getCustomPropertiesMap().get('modelVersionName')?.getStringValue(),
    modelVersionId: artifact.getCustomPropertiesMap().get('modelVersionId')?.getStringValue(),
    registeredModelId: artifact.getCustomPropertiesMap().get('registeredModelId')?.getStringValue(),
  };
};
