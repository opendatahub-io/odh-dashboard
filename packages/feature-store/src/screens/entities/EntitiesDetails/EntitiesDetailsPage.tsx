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
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import EntityDetailsTabs from './EntityDetailsTabs';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import useFeatureStoreEntityByName from '../../../apiHooks/useFeatureStoreEntityByName';
import { featureStoreRootRoute } from '../../../routes';
import FeatureStorePageTitle from '../../../components/FeatureStorePageTitle';
import FeatureStoreBreadcrumb from '../../../screens/components/FeatureStoreBreadcrumb';

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
        <FeatureStorePageTitle
          isDetailsPage
          breadcrumb={
            <Breadcrumb>
              <FeatureStoreBreadcrumb
                dataTestId="entity-details-breadcrumb-link"
                pageName="Entities"
                linkTo={`${featureStoreRootRoute()}/entities`}
                projectName={currentProject || ''}
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
        />
      }
    >
      <EntityDetailsTabs entity={entity} />
    </ApplicationsPage>
  );
};

export default EntitiesDetailsPage;
