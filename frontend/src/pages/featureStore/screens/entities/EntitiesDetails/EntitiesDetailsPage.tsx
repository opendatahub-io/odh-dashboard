import React from 'react';
import {
  EmptyStateBody,
  EmptyStateVariant,
  EmptyState,
  Breadcrumb,
  BreadcrumbItem,
} from '@patternfly/react-core';
import { t_global_spacer_xs as ExtraSmallSpacerSize } from '@patternfly/react-tokens';
import { SearchIcon } from '@patternfly/react-icons';
import { Link, useParams } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { useFeatureStoreProject } from '#~/pages/featureStore/FeatureStoreContext';
import useFeatureStoreEntityByName from '#~/pages/featureStore/apiHooks/useFeatureStoreEntityByName.ts';
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

  return (
    <ApplicationsPage
      empty={!entityLoaded}
      emptyStatePage={emptyState}
      title={entity.spec.name}
      description={entity.spec.description}
      loadError={entityLoadError}
      loaded={entityLoaded}
      provideChildrenPadding
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="/featureStore/entities">Entities</Link>} />
          <BreadcrumbItem
            data-testid="breadcrumb-version-name"
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
