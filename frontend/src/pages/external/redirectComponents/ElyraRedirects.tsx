import React from 'react';
import { useLocation, useNavigate, useParams, matchPath } from 'react-router-dom';
import { Button } from '@patternfly/react-core';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import RedirectErrorState from '#~/pages/external/RedirectErrorState';
import { globalPipelineRunDetailsRoute } from '#~/routes/pipelines/runs';
import { useRedirect } from '#~/utilities/useRedirect';
import { pipelinesRootPath } from '#~/routes/pipelines/global';

/**
 * Handles redirects from Elyra URLs to internal routes.
 *
 * Matches and redirects:
 * - Run URL: /external/elyra/{namespace}/runs/{runId}
 */
const ElyraRedirects: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const createRedirectPath = React.useCallback(() => {
    if (!namespace) {
      throw new Error('Missing namespace parameter');
    }

    const match = matchPath('/external/elyra/:namespace/runs/:runId', location.pathname);
    const runId = match?.params.runId;
    if (runId) {
      return globalPipelineRunDetailsRoute(namespace, runId);
    }

    throw new Error('The URL format is invalid.');
  }, [namespace, location.pathname]);

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
            <Button variant="link" onClick={() => navigate(pipelinesRootPath)}>
              Go to Pipelines
            </Button>
          }
        />
      }
    />
  );
};

export default ElyraRedirects;
