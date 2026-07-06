import { Artifact, Value } from '#~/third_party/mlmd';
import { ArtifactType } from '#~/concepts/pipelines/kfTypes';
import { ArtifactProperty, PipelineRunArtifactModelData } from './types';

export const getArtifactProperties = (artifact: Artifact): ArtifactProperty[] => {
  const result: ArtifactProperty[] = [];

  artifact.getCustomPropertiesMap().forEach((value, key) => {
    if (key !== 'display_name' && key !== 'store_session_info') {
      let propertyValue = '';

      switch (value.getValueCase()) {
        case Value.ValueCase.STRING_VALUE:
          propertyValue = value.getStringValue();
          break;
        case Value.ValueCase.INT_VALUE:
          propertyValue = value.getIntValue().toString();
          break;
        case Value.ValueCase.DOUBLE_VALUE:
          propertyValue = value.getDoubleValue().toString();
          break;
        case Value.ValueCase.BOOL_VALUE:
          propertyValue = value.getBoolValue().toString();
          break;
        default:
          propertyValue = '';
      }

      result.push({
        name: key,
        value: propertyValue,
      });
    }
  });

  return result;
};

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
