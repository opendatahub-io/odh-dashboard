// Modules -------------------------------------------------------------------->

import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  DescriptionList,
  DescriptionListTerm,
  DescriptionListGroup,
  DescriptionListDescription,
  PageSection,
  Timestamp,
  TimestampTooltipVariant,
} from '@patternfly/react-core';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import ApplicationsPage from '~/app/components/ApplicationsPage';
import { useConnectionTypes } from '~/app/hooks/useConnectionTypes';
import { relativeTime } from '@odh-dashboard/ui-core/utilities/time';
import type { Identified, Labelled, Valued, ConnectionType } from '~/app/types';

// Types ---------------------------------------------------------------------->

type ValueRenderer = (c: ConnectionType) => React.ReactNode;

type RenderedConnectionTypeValue = Identified<string> & Labelled<string> & Valued<ValueRenderer>;

// Globals -------------------------------------------------------------------->

const renderedConnectionTypeValues: Record<string, RenderedConnectionTypeValue> = {
  category: {
    id: 'category',
    label: 'Category',
    value: () => null,
  },
  license: {
    id: 'license',
    label: 'License',
    value: () => null,
  },
  source: {
    id: 'source',
    label: 'Source',
    value: () => null,
  },
  tags: {
    id: 'tags',
    label: 'Tags',
    value: () => null,
  },
  provider: {
    id: 'provider',
    label: 'Provider',
    value: (connectionType) => connectionType.resource.provider,
  },
  created: {
    id: 'created',
    label: 'Created',
    value: (connectionType) => {
      const createdAt = new Date(connectionType?.metadata.created_at ?? '');
      return (
        <Timestamp date={createdAt} tooltip={{ variant: TimestampTooltipVariant.default }}>
          {relativeTime(Date.now(), createdAt.getTime())}
        </Timestamp>
      );
    },
  },
  last_modified: {
    id: 'last_modified',
    label: 'Last modified',
    value: (connectionType) => {
      const updatedAt = new Date(connectionType?.metadata.updated_at ?? '');
      return (
        <Timestamp date={updatedAt} tooltip={{ variant: TimestampTooltipVariant.default }}>
          {relativeTime(Date.now(), updatedAt.getTime())}
        </Timestamp>
      );
    },
  },
};

// Private -------------------------------------------------------------------->

// Components ----------------------------------------------------------------->

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
      <PageSection data-connection-type-id={connectionType?.metadata.id}>
        {connectionType && (
          <DescriptionList>
            {Object.values(renderedConnectionTypeValues).map((renderedValue) => (
              <DescriptionListGroup key={renderedValue.id}>
                <DescriptionListTerm>{renderedValue.label}</DescriptionListTerm>
                <DescriptionListDescription>
                  {renderedValue.value(connectionType)}
                </DescriptionListDescription>
              </DescriptionListGroup>
            ))}
          </DescriptionList>
        )}
      </PageSection>
    </ApplicationsPage>
  );
};

// Public --------------------------------------------------------------------->

export default ConnectionTypeDetails;
