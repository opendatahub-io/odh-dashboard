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
 * The run ID is always in the 3rd path segment (index 2) after the protocol.
 */
const extractRunIdFromUri = (uri: string): string | undefined => {
  if (!uri) return undefined;

  // Remove protocol (s3://, minio://, etc.) and split by /
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
