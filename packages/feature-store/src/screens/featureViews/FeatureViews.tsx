import React from 'react';
import { Flex } from '@patternfly/react-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeatureViewsListView from './FeatureViewsListView';
import FeatureStoreProjectSelectorNavigator from '../components/FeatureStoreProjectSelectorNavigator';
import FeatureStorePageTitle from '../../components/FeatureStorePageTitle';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import useFeatureViews from '../../apiHooks/useFeatureViews';
import { featureStoreRoute } from '../../routes';
import FeatureStoreObjectIcon from '../../components/FeatureStoreObjectIcon';
import FeatureStoreAccessDenied from '../../components/FeatureStoreAccessDenied';
import ConnectedWorkbenchesLink from '../../components/ConnectedWorkbenchesLink';
import { FeatureStoreEmptyState } from '../components/EmptyStateFeatureStore';

const title = 'Feature views';
const description =
  'Select a feature store to view and manage its feature views. A feature view defines how to retrieve a logical group of features from a specific data source. It binds a data source to one or more entities and contains the logic for transforming the raw data into feature values.';

const FeatureViews = (): React.ReactElement => {
  const { currentProject } = useFeatureStoreProject();
  const {
    data: featureViews,
    loaded: featureViewsLoaded,
    error: featureViewsLoadError,
  } = useFeatureViews({ project: currentProject });

  const emptyState = (
    <FeatureStoreEmptyState
      resourceTypeSingular="feature view"
      resourceTypePlural="feature views"
    />
  );

  return (
    <ApplicationsPage
      empty={featureViews.featureViews.length === 0}
      emptyStatePage={emptyState}
      loadErrorPage={
        <FeatureStoreAccessDenied resourceType="feature views" projectName={currentProject} />
      }
      title={
        <FeatureStorePageTitle
          title={
            <FeatureStoreObjectIcon
              objectType="feature_view"
              title={title}
              showBackground
              useTypedColors
            />
          }
        />
      }
      description={description}
      loadError={featureViewsLoadError}
      loaded={featureViewsLoaded}
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
      <FeatureViewsListView featureViews={featureViews} fsProject={currentProject} />
    </ApplicationsPage>
  );
};

export default FeatureViews;
