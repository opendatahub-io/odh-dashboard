import React from 'react';
import { Link } from 'react-router';
import { Skeleton, Truncate } from '@patternfly/react-core';
import { Artifact } from '#~/third_party/mlmd';
import usePipelineRunById from '#~/concepts/pipelines/apiHooks/usePipelineRunById';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { globalPipelineRunDetailsRoute } from '#~/routes/pipelines/runs';
import { getGenericErrorCode } from '#~/api/errorUtils';

type ArtifactRunCellProps = {
  artifact: Artifact;
};

/**
 * Extract run ID from artifact URI.
 * KFP artifact URIs typically follow the pattern:
 * s3://bucket/pipeline-name/run-id/task-name/artifact-name
 * or: minio://bucket/pipelines/run-id/...
 */
const extractRunIdFromUri = (uri: string): string | undefined => {
  if (!uri) return undefined;

  // Try to match UUID pattern in the URI
  // UUIDs are 8-4-4-4-12 hex digits separated by hyphens
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = uri.match(uuidPattern);
  return match ? match[0] : undefined;
};

const ArtifactRunCell: React.FC<ArtifactRunCellProps> = ({ artifact }) => {
  const { namespace } = usePipelinesAPI();
  const uri = artifact.getUri();
  const runId = extractRunIdFromUri(uri);

  // Fetch the full run details from KFP API to get display_name and experiment_id
  const [run, runLoaded, runError] = usePipelineRunById(runId);

  if (!runId) {
    return <>—</>;
  }

  if (runError) {
    const errorCode = getGenericErrorCode(runError);
    if (errorCode === 404) {
      // Run was deleted - show dash instead of UUID
      return <>—</>;
    }
    // Other errors (500, network, etc.) - show the run ID as fallback
    return <Truncate content={runId} tooltipPosition="top" />;
  }

  if (!runLoaded) {
    return <Skeleton />;
  }

  if (!run) {
    // Run not found (shouldn't happen after successful load, but handle it)
    return <>—</>;
  }

  const displayName = run.display_name || runId;

  return (
    <Link to={globalPipelineRunDetailsRoute(namespace, runId)}>
      <Truncate content={displayName} tooltipPosition="top" />
    </Link>
  );
};

export default ArtifactRunCell;
