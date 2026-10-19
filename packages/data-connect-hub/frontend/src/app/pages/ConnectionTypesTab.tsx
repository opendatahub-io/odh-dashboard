import React from 'react';
import { EmptyState, EmptyStateBody, PageSection, Spinner } from '@patternfly/react-core';
import { useLocation, useNavigate } from 'react-router-dom';
import ConnectionTypesGallery from '~/app/components/ConnectionTypesGallery';
import { useConnectionTypes } from '~/app/hooks/useConnectionTypes';
import type { ConnectionType } from '~/app/types';

type ConnectionTypesTabProps = { namespace: string };

const ConnectionTypesTab: React.FC<ConnectionTypesTabProps> = ({ namespace }) => {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [connectionTypes, typesLoaded, typesError] = useConnectionTypes(namespace);

  const handleConnectionTypeClick = React.useCallback(
    (connectionType: ConnectionType) => {
      const detailsPath = `${pathname.replace(/\/$/, '')}/${encodeURIComponent(
        connectionType.metadata.id,
      )}${search}`;
      navigate(detailsPath);
    },
    [navigate, pathname, search],
  );

  const hasError = Boolean(typesError);
  const shouldRenderLoadingState = !typesLoaded && !hasError;
  const shouldRenderGallery = typesLoaded && !hasError;

  return (
    <PageSection isFilled>
      <p className="pf-v6-u-mb-md">
        Discover and configure pre-defined data connections available to your organization. Browse
        available catalogs to easily connect your projects to external storage, databases, and
        services.
      </p>
      {shouldRenderLoadingState && (
        <EmptyState headingLevel="h3" titleText="Loading data connection types">
          <Spinner aria-label="Loading data connection types" />
        </EmptyState>
      )}
      {hasError && (
        <EmptyState headingLevel="h3" titleText="Unable to load data connection types">
          <EmptyStateBody>{typesError?.message}</EmptyStateBody>
        </EmptyState>
      )}
      {shouldRenderGallery && (
        <ConnectionTypesGallery
          connectionTypes={connectionTypes}
          onConnectionTypeClick={handleConnectionTypeClick}
        />
      )}
    </PageSection>
  );
};

export default ConnectionTypesTab;
