import React from 'react';
import {
  EmptyStateBody,
  EmptyStateVariant,
  EmptyState,
  Breadcrumb,
  BreadcrumbItem,
  EmptyStateFooter,
  EmptyStateActions,
} from '@patternfly/react-core';
import { t_global_spacer_xs as ExtraSmallSpacerSize } from '@patternfly/react-tokens';
import { SearchIcon, PathMissingIcon } from '@patternfly/react-icons';
import { Link, useParams } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { useFeatureStoreProject } from '#~/pages/featureStore/FeatureStoreContext';
import useFeatureStoreEntityByName from '#~/pages/featureStore/apiHooks/useFeatureStoreEntityByName.ts';
import { featureStoreRootRoute } from '#~/pages/featureStore/routes.ts';
import EntityDetailsTabs from './EntityDetailsTabs';

const EntitiesDetailsPage = (): React.ReactElement => {
  const { currentProject } = useFeatureStoreProject();
  const { entityName } = useParams();
  const {
    data: entity,
    loaded: entityLoaded,
    error: entityLoadError,
  } = useFeatureStoreEntityByName(currentProject, entityName);

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={SearchIcon}
      titleText="No entities"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        No entities have been found in this project.
      </EmptyStateBody>
    </EmptyState>
  );

  const errorState = (
    <EmptyState
      headingLevel="h6"
      icon={PathMissingIcon}
      titleText="Entity not found"
      variant={EmptyStateVariant.lg}
      data-testid="error-state-title"
    >
      <EmptyStateBody data-testid="error-state-body">
        {entityLoadError?.message || 'The requested entity could not be found.'}
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Link to={`${featureStoreRootRoute()}/entities`}>Go to Entities</Link>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={!entityLoaded}
      emptyStatePage={emptyState}
      title={entity.spec.name}
      data-testid="entity-details-page"
      description={entity.spec.description}
      loadError={entityLoadError}
      loadErrorPage={entityLoadError ? errorState : undefined}
      loaded={entityLoaded}
      provideChildrenPadding
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={`${featureStoreRootRoute()}/entities`}>Entities</Link>}
            data-testid="entity-details-breadcrumb-link"
          />
          <BreadcrumbItem
            data-testid="entity-details-breadcrumb-item"
            isActive
            style={{
              textDecoration: 'underline',
              textUnderlineOffset: ExtraSmallSpacerSize.var,
            }}
          >
            {entityName}
          </BreadcrumbItem>
        </Breadcrumb>
      }
    >
      <EntityDetailsTabs entity={entity} />
    </ApplicationsPage>
  );
};

export default EntitiesDetailsPage;
