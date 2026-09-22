// Modules -------------------------------------------------------------------->

import React from 'react';
import { Breadcrumb, BreadcrumbItem, PageSection, Skeleton } from '@patternfly/react-core';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import ApplicationsPage from '~/app/components/ApplicationsPage';
import { useConnectionType } from '~/app/hooks/useConnectionType';
import { ConnectionTypeIcon, ConnectionTypeValues } from '~/app/components/ConnectionType.tsx';

// Types ---------------------------------------------------------------------->

// Globals -------------------------------------------------------------------->

// Private -------------------------------------------------------------------->

// Components ----------------------------------------------------------------->

const ConnectionTypeDetails: React.FC = () => {
  const { connectionTypeId = '' } = useParams<'connectionTypeId'>();
  const { search } = useLocation();
  const [searchParams] = useSearchParams();
  const namespace = searchParams.get('project') ?? '';
  const [connectionType, loaded, loadError] = useConnectionType(namespace, connectionTypeId);

  const loadingSkeleton = <Skeleton screenreaderText="Loading connection type" />;

  let title = loadingSkeleton;
  let description = loadingSkeleton;

  if (connectionType) {
    title = (
      <>
        <ConnectionTypeIcon
          connectionType={connectionType}
          iconProps={{
            size: 'xl',
            className: 'pf-v6-u-mr-md',
          }}
        />
        {connectionType.resource.name}
      </>
    );
    description = <>{connectionType.resource.description ?? ''}</>;
  }

  return (
    <ApplicationsPage
      title={title}
      description={description}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to={{ pathname: '..', search }} relative="path">
              Connection types
            </Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>
            {connectionType?.resource.name ?? loadingSkeleton}
          </BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded}
      loadError={loadError}
      errorMessage="Unable to load connection type"
      empty={loaded && !connectionType}
      emptyMessage="Connection type not found"
    >
      <PageSection
        data-testid="connection-type-details"
        data-connection-type-id={connectionType?.metadata.id}
      >
        {connectionType && <ConnectionTypeValues connectionType={connectionType} />}
      </PageSection>
    </ApplicationsPage>
  );
};

// Public --------------------------------------------------------------------->

export default ConnectionTypeDetails;
