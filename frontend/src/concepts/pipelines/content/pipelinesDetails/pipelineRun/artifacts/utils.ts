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

const MAX_MARKDOWN_BYTES = 5 * 1024 * 1024;

/**
 * Read a Response body as text with a byte-size cap (5 MB).
 * Returns undefined when the artifact exceeds the limit, letting
 * callers fall back to an iframe.
 *
 * When Content-Length is available and within limits, uses response.text().
 * When Content-Length is missing, streams the body and aborts if the
 * limit is exceeded — prevents unbounded memory consumption (CWE-400).
 */
export const readBoundedText = async (response: Response): Promise<string | undefined> => {
  const reader = response.body?.getReader();
  if (!reader) {
    return undefined;
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    totalBytes += value.byteLength;
    if (totalBytes > MAX_MARKDOWN_BYTES) {
      await reader.cancel();
      return undefined;
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
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
