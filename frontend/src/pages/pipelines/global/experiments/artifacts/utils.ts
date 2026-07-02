/** URI related utils source: https://github.com/kubeflow/pipelines/blob/master/frontend/src/lib/Utils.tsx */
import { getArtifactModelData } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/utils';
import { Artifact } from '#~/third_party/mlmd';

export const getArtifactName = (artifact: Artifact | undefined): string => {
  const artifactObject = artifact?.toObject();
  return (
    artifactObject?.name ||
    artifactObject?.customPropertiesMap.find(([name]) => name === 'display_name')?.[1]
      .stringValue ||
    '(No name)'
  );
};

export const getIsArtifactModelRegistered = (artifact?: Artifact): boolean => {
  const artifactModelData = getArtifactModelData(artifact);
  return Boolean(artifactModelData.registeredModelName);
};

/**
 * Extract run ID from artifact URI.
 *
 * KFP artifact URIs follow the pattern:
 * s3://bucket/pipeline-name/run-id/task-name/artifact-name
 * The run ID is always in the 3rd path segment (index 2) after the protocol.
 *
 * ## Why URI parsing instead of MLMD metadata?
 *
 * The authoritative MLMD path exists: Artifact → Event → Execution → Context → Run ID
 * However, URI parsing is preferred because:
 * - **Performance**: 0 API calls vs 3 sequential MLMD queries per artifact
 * - **Simplicity**: Synchronous string parsing vs async relationship traversal
 * - **Reliability**: URI pattern is standardized by KFP and validated with UUID regex
 * - **Scale**: For tables with 50+ artifacts, URI parsing is instant while MLMD would
 *   require 150+ sequential API calls
 *
 * The MLMD relationship chain is available via:
 * - `useGetEventByArtifactId(artifactId)` → Event
 * - `Event.getExecutionId()` → Execution ID
 * - `useGetPipelineRunContextByExecution(executionId)` → Context
 * - `Context.getName()` → Run ID (UUID)
 *
 * This function validates the extracted UUID format before returning to ensure safety.
 */
export const extractRunIdFromUri = (uri: string): string | undefined => {
  if (!uri) {
    return undefined;
  }

  const pathWithoutProtocol = uri.split('://')[1];
  if (!pathWithoutProtocol) {
    return undefined;
  }

  const segments = pathWithoutProtocol.split('/').filter(Boolean);
  // segments[0] = bucket
  // segments[1] = pipeline-name
  // segments[2] = run-id (what we want)
  // segments[3] = task-name
  // segments[4+] = artifact path

  const runIdSegment = segments[2];
  if (!runIdSegment) {
    return undefined;
  }

  // Verify it's a valid UUID format before returning
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(runIdSegment) ? runIdSegment : undefined;
};
