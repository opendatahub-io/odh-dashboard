import React from 'react';
import { EmptyStateBody, EmptyStateVariant, EmptyState } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeatureStoreEntitiesListView from './EntitiesTable/FeatureStoreEntitiesListView';
import FeatureStoreProjectSelectorNavigator from '../components/FeatureStoreProjectSelectorNavigator';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import useFeatureStoreEntities from '../../apiHooks/useFeatureStoreEnitites';
import { featureStoreRoute } from '../../routes';
import FeatureStorePageTitle from '../../components/FeatureStorePageTitle';

const title = 'Entities';
const description =
  'Select a feature store repository to view and manage its entities. Entities are collections of related features and can be mapped to your use case (for example, customers, products, transactions).';

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
        Select a different feature store repository or create a entities in a workbench.
      </EmptyStateBody>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={entities.entities.length === 0}
      emptyStatePage={emptyState}
      title={<FeatureStorePageTitle title={title} />}
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
