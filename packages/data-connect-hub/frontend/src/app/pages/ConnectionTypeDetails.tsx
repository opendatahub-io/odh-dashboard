import React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import ApplicationsPage from '~/app/components/ApplicationsPage';
import { useConnectionTypes } from '~/app/hooks/useConnectionTypes';

const ConnectionTypeDetails: React.FC = () => {
  const { connectionTypeId = '' } = useParams<'connectionTypeId'>();
  const { search } = useLocation();
  const [searchParams] = useSearchParams();
  const namespace = searchParams.get('project') ?? '';
  // TODO [ Gustavo ] Although this works for now - we should really be using a `useConnectionType(namespace, connectionId)` with a dedicated use of GET /api/v1alpha1/data/connection-types/{id}
  const [connectionTypes, loaded, loadError] = useConnectionTypes(namespace);
  const connectionType = connectionTypes.find((item) => item.metadata.id === connectionTypeId);

  return (
    <ApplicationsPage
      title={connectionType?.resource.name ?? connectionTypeId}
      description={connectionType?.resource.description}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to={{ pathname: '..', search }} relative="path">
              Connection types
            </Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>
            {connectionType?.resource.name ?? connectionTypeId}
          </BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded}
      loadError={loadError}
      errorMessage="Unable to load connection type"
      empty={loaded && !connectionType}
      emptyMessage="Connection type not found"
    >
      <div>{connectionType?.metadata.id}</div>
    </ApplicationsPage>
  );
};

export default ConnectionTypeDetails;
