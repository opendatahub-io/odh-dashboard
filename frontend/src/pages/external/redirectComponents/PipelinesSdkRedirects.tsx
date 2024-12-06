import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { experimentRunsRoute, globalPipelineRunDetailsRoute } from '~/routes';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useRedirect } from '~/utilities/useRedirect';

/**
 * Handles redirects from Pipeline SDK URLs to internal routes.
 *
 * Matches and redirects:
 * - Experiment URL: /external/pipelinesSdk/{namespace}/#/experiments/details/{experimentId}
 * - Run URL: /external/pipelinesSdk/{namespace}/#/runs/details/{runId}
 */
const PipelinesSdkRedirects: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const location = useLocation();

  const createRedirectPath = React.useCallback(() => {
    if (!namespace) {
      throw new Error('Missing namespace parameter');
    }

    // Extract experimentId from hash
    const experimentMatch = location.hash.match(/\/experiments\/details\/([^/]+)$/);
    if (experimentMatch) {
      const experimentId = experimentMatch[1];
      return experimentRunsRoute(namespace, experimentId);
    }

    // Extract runId from hash
    const runMatch = location.hash.match(/\/runs\/details\/([^/]+)$/);
    if (runMatch) {
      const runId = runMatch[1];
      return globalPipelineRunDetailsRoute(namespace, runId);
    }

    throw new Error('Invalid URL format');
  }, [namespace, location.hash]);

  const [redirect, { loaded }] = useRedirect(createRedirectPath);

  React.useEffect(() => {
    redirect();
  }, [redirect]);

  return (
    <ApplicationsPage title="Redirecting..." description={null} loaded={loaded} empty={false} />
  );
};

export default PipelinesSdkRedirects;
