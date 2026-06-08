import React from 'react';
import { EmptyStateBody, EmptyStateVariant, EmptyState, Flex } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeatureStoreEntitiesListView from './EntitiesTable/FeatureStoreEntitiesListView';
import FeatureStoreProjectSelectorNavigator from '../components/FeatureStoreProjectSelectorNavigator';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import useFeatureStoreEntities from '../../apiHooks/useFeatureStoreEntities';
import { featureStoreRoute } from '../../routes';
import FeatureStorePageTitle from '../../components/FeatureStorePageTitle';
import FeatureStoreObjectIcon from '../../components/FeatureStoreObjectIcon';
import FeatureStoreAccessDenied from '../../components/FeatureStoreAccessDenied';
import ConnectedWorkbenchesLink from '../../components/ConnectedWorkbenchesLink';
import { getFeatureStoreObjectDescription } from '../../utils';
import { FeatureStoreObject } from '../../const';

const title = 'Entities';
const description = `Select a feature store to view and manage its entities. ${getFeatureStoreObjectDescription(
  FeatureStoreObject.ENTITIES,
).trim()}`;

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
        Select a different feature store or create an entity in a workbench.
      </EmptyStateBody>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={entities.entities.length === 0}
      emptyStatePage={emptyState}
      loadErrorPage={
        <FeatureStoreAccessDenied resourceType="entities" projectName={currentProject} />
      }
      title={
        <FeatureStorePageTitle
          title={
            <FeatureStoreObjectIcon
              objectType="entity"
              title={title}
              showBackground
              useTypedColors
            />
          }
        />
      }
      description={description}
      loadError={entitiesLoadError}
      loaded={entitiesLoaded}
      headerContent={
        <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapMd' }}>
          <FeatureStoreProjectSelectorNavigator
            getRedirectPath={(featureStoreObject, featureStoreProject) =>
              featureStoreRoute(featureStoreObject, featureStoreProject)
            }
          />
          <ConnectedWorkbenchesLink />
        </Flex>
      }
      provideChildrenPadding
    >
      <FeatureStoreEntitiesListView entities={entities} />
    </ApplicationsPage>
  );
};

export default FeatureStoreEntities;
