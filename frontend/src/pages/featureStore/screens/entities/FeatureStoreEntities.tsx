import React from 'react';
import { EmptyStateBody, EmptyStateVariant, EmptyState } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { ProjectObjectType } from '#~/concepts/design/utils';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import useFeatureStoreEntities from '#~/pages/featureStore/apiHooks/useFeatureStoreEnitites';
import FeatureStoreProjectSelectorNavigator from '#~/pages/featureStore/screens/components/FeatureStoreProjectSelectorNavigator';
import { featureStoreRoute } from '#~/pages/featureStore/FeatureStoreRoutes';
import { useFeatureStoreProject } from '#~/pages/featureStore/FeatureStoreContext.tsx';
import FeatureStoreEntitiesListView from './FeatureStoreEntitiesListView';

const title = 'Entities';
const description =
  'Select a workspace to view and manage its entities. Entities are collections of related features and can be mapped to the domain of your use case.';

const FeatureStoreEntities = (): React.ReactElement => {
  const { currentProject } = useFeatureStoreProject();
  const {
    data: entities,
    loaded: entitiesLoaded,
    error: entitiesLoadError,
  } = useFeatureStoreEntities(currentProject);

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
      empty={entities.entities.length === 0}
      emptyStatePage={emptyState}
      title={<TitleWithIcon title={title} objectType={ProjectObjectType.modelEvaluation} />}
      description={description}
      loadError={entitiesLoadError}
      loaded={entitiesLoaded}
      headerContent={
        <FeatureStoreProjectSelectorNavigator
          getRedirectPath={(featureStoreObject, featureStoreProject) =>
            featureStoreRoute(featureStoreObject, featureStoreProject)
          }
        />
      }
      provideChildrenPadding
    >
      <FeatureStoreEntitiesListView entities={entities} />
    </ApplicationsPage>
  );
};

export default FeatureStoreEntities;
