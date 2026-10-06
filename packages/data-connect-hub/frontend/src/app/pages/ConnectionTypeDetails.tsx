/* eslint-disable no-console */

// Modules -------------------------------------------------------------------->

import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Flex,
  PageSection,
  Skeleton,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import ApplicationsPage from '~/app/components/ApplicationsPage';
import { useConnectionType } from '~/app/hooks/useConnectionType';
import {
  ConnectionTypeIcon,
  ConnectionTypeLabel,
  ConnectionTypeValues,
} from '~/app/components/ConnectionType.tsx';
import { createConnection } from '~/app/api/dch.ts';
import CreateConnectionWizard from '~/app/components/CreateConnectionWizard.tsx';

// Types ---------------------------------------------------------------------->

// Globals -------------------------------------------------------------------->

// Private -------------------------------------------------------------------->

// Components ----------------------------------------------------------------->

type ConnectionTypeDetailsContentProps = {
  namespace: string;
};
const ConnectionTypeDetailsContent: React.FC<ConnectionTypeDetailsContentProps> = ({
  namespace,
}) => {
  const { connectionTypeId = '' } = useParams<'connectionTypeId'>();
  const { search } = useLocation();
  const [connectionType, loaded, loadError] = useConnectionType(namespace, connectionTypeId);
  const [isConnectionWizardOpen, setIsConnectionWizardOpen] = React.useState<boolean>(false);

  const loadingSkeleton = <Skeleton screenreaderText="Loading connection type" />;

  let title = loadingSkeleton;
  let description = loadingSkeleton;

  if (connectionType) {
    title = (
      <Flex alignItems={{ default: 'alignItemsCenter' }}>
        <ConnectionTypeIcon
          connectionType={connectionType}
          iconProps={{
            size: 'xl',
            className: 'pf-v6-u-mr-md',
          }}
        />
        <span className="pf-v6-u-mr-md">{connectionType.resource.name}</span>
        <ConnectionTypeLabel connectionType={connectionType} />
      </Flex>
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
      headerAction={
        <Split hasGutter>
          <SplitItem>
            <Button
              variant="primary"
              data-testid="connection-type-details-create-connection"
              onClick={() => setIsConnectionWizardOpen(true)}
            >
              Create connection
            </Button>
          </SplitItem>
        </Split>
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
        <CreateConnectionWizard
          isOpen={isConnectionWizardOpen}
          namespace={namespace}
          onClose={() => setIsConnectionWizardOpen(false)}
          onCreate={async (data, selectedNamespace) => {
            await createConnection('')({}, selectedNamespace, data);
          }}
          initialFormData={{
            data_connection_type_id: connectionType?.id,
          }}
        />
      </PageSection>
    </ApplicationsPage>
  );
};

const ConnectionTypeDetails: React.FC = () => {
  const { search } = useLocation();
  const [searchParams] = useSearchParams();
  const namespace = searchParams.get('project');

  if (namespace) {
    return <ConnectionTypeDetailsContent namespace={namespace} />;
  }

  return <Navigate to={{ pathname: '..', search }} relative="path" replace />;
};

// Public --------------------------------------------------------------------->

export default ConnectionTypeDetails;
