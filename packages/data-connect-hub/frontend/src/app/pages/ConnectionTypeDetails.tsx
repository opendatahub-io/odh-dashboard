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
  Skeleton,
  Timestamp,
  TimestampTooltipVariant,
} from '@patternfly/react-core';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import ApplicationsPage from '~/app/components/ApplicationsPage';
import { useConnectionType } from '~/app/hooks/useConnectionType';
import { relativeTime } from '@odh-dashboard/ui-core/utilities/time';
import { ConnectionTypeIcon } from '~/app/components/ConnectionType.tsx';
import type { Identified, Labelled, Valued, ConnectionType } from '~/app/types';

// Types ---------------------------------------------------------------------->

type ValueRenderer = (c: ConnectionType) => React.ReactNode;

type RenderedConnectionTypeValue = Identified<string> &
  Labelled<string> &
  Valued<ValueRenderer> & {
    shouldRender?: boolean;
  };

// Globals -------------------------------------------------------------------->

const renderedConnectionTypeValues: Record<string, RenderedConnectionTypeValue> = {
  category: {
    id: 'category',
    label: 'Category',
    value: () => null,
    shouldRender: false,
  },
  license: {
    id: 'license',
    label: 'License',
    value: () => null,
    shouldRender: false,
  },
  source: {
    id: 'source',
    label: 'Source',
    value: () => null,
    shouldRender: false,
  },
  tags: {
    id: 'tags',
    label: 'Tags',
    value: () => null,
    shouldRender: false,
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
      <PageSection data-connection-type-id={connectionType?.metadata.id}>
        {connectionType && (
          <DescriptionList>
            {Object.values(renderedConnectionTypeValues)
              .filter((v) => v.shouldRender !== false)
              .map((renderedValue) => (
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
