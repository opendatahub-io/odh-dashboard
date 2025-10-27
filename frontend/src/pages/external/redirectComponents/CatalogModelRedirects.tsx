import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@patternfly/react-core';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import RedirectErrorState from '#~/pages/external/RedirectErrorState';
import { useRedirect } from '#~/utilities/useRedirect';
import { modelCatalogRoute } from '#~/routes/modelCatalog/catalogModelDetails';

/**
 * Handles redirects from external URLs to internal catalog model details routes.
 *
 * Matches and redirects:
 * - Catalog Model Details URL: /external/catalog/{sourceId}/{modelName}
 */
const CatalogModelRedirects: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const createRedirectPath = React.useCallback(() => {
    // Extract the path after /external/catalog/
    const catalogPath = location.pathname.replace('/external/catalog/', '');

    if (!catalogPath) {
      throw new Error('Missing catalog model path');
    }

    // Split the path into parts - take first two segments for sourceId and modelName
    const pathParts = catalogPath.split('/');

    if (pathParts.length < 2) {
      throw new Error(
        'Invalid catalog model path. Expected: /external/catalog/{sourceId}/{modelName}',
      );
    }
    const [sourceId, ...modelNameParts] = pathParts;
    const modelName = modelNameParts.join('/');

    if (!sourceId || !modelName) {
      throw new Error('Missing required parameters: sourceId or modelName');
    }

    return `${modelCatalogRoute}/${sourceId}/${modelName}`;
  }, [location.pathname]);

  const { error } = useRedirect(createRedirectPath);

  return (
    <ApplicationsPage
      loaded
      empty={false}
      loadError={error}
      loadErrorPage={
        <RedirectErrorState
          title="Error redirecting to catalog model"
          errorMessage={error?.message}
          actions={
            <Button variant="link" onClick={() => navigate(modelCatalogRoute)}>
              Go to Model Catalog
            </Button>
          }
        />
      }
    />
  );
};

export default CatalogModelRedirects;
