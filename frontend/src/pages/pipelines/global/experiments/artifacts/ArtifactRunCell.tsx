import React from 'react';
import { Link } from 'react-router';
import { Skeleton, Truncate } from '@patternfly/react-core';
import { Artifact } from '#~/third_party/mlmd';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { globalPipelineRunDetailsRoute } from '#~/routes/pipelines/runs';
import { getGenericErrorCode } from '#~/api/errorUtils';
import { useArtifactRunsCache } from './ArtifactRunsContext';
import { extractRunIdFromUri } from './utils';

type ArtifactRunCellProps = {
  artifact: Artifact;
};

const ArtifactRunCell: React.FC<ArtifactRunCellProps> = ({ artifact }) => {
  const { namespace } = usePipelinesAPI();
  const uri = artifact.getUri();
  const runId = extractRunIdFromUri(uri);
  const { runs, errors, loading } = useArtifactRunsCache();

  if (!runId) {
    return <>—</>;
  }

  // Check if we're currently loading this run (takes priority over stale errors)
  if (loading.has(runId)) {
    return <Skeleton />;
  }

  // Check if we have an error for this run
  if (runId in errors) {
    const errorCode = getGenericErrorCode(errors[runId]);
    if (errorCode === 404) {
      // Run was deleted - show dash instead of UUID
      return <>—</>;
    }
    // Other errors (500, network, etc.) - show the run ID as fallback
    return <Truncate content={runId} tooltipPosition="top" />;
  }

  // Get the run from cache
  const run = runs[runId];
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
