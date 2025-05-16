import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@patternfly/react-core';
import { experimentRunsRoute } from '~/routes/pipelines/experiments';
import { globalPipelineRunDetailsRoute } from '~/routes/pipelines/runs';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useRedirect } from '~/utilities/useRedirect';
import RedirectErrorState from '~/pages/external/RedirectErrorState';

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
  const navigate = useNavigate();

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

    throw new Error('The URL format is invalid.');
  }, [namespace, location.hash]);

  const { error } = useRedirect(createRedirectPath);

  return (
    <ApplicationsPage
      loaded
      empty={false}
      loadError={error}
      loadErrorPage={
        <RedirectErrorState
          title="Error redirecting to pipelines"
          errorMessage={error?.message}
          actions={
            <>
              <Button variant="link" onClick={() => navigate('/pipelines')}>
                Go to Pipelines
              </Button>
              <Button variant="link" onClick={() => navigate('/experiments')}>
                Go to Experiments
              </Button>
            </>
          }
        />
      }
    />
  );
};

export default PipelinesSdkRedirects;
