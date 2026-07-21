import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Flex } from '@patternfly/react-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeaturesList from './FeaturesList';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import { featureStoreRoute } from '../../FeatureStoreRoutes';
import useFeatures from '../../apiHooks/useFeatures';
import FeatureStoreProjectSelectorNavigator from '../components/FeatureStoreProjectSelectorNavigator';
import FeatureStorePageTitle from '../../components/FeatureStorePageTitle';
import FeatureStoreObjectIcon from '../../components/FeatureStoreObjectIcon';
import FeatureStoreAccessDenied from '../../components/FeatureStoreAccessDenied';
import ConnectedWorkbenchesLink from '../../components/ConnectedWorkbenchesLink';
import { FeatureStoreEmptyState } from '../components/EmptyStateFeatureStore';

const title = 'Features';
const description =
  'Select a feature store to view its features. A feature is a schema containing a name and a type, and is used to represent the data stored in feature views for both training and serving purposes.';

const Features = (): React.ReactElement => {
  const { currentProject } = useFeatureStoreProject();
  const [searchParams] = useSearchParams();
  const {
    data: features,
    loaded: featuresLoaded,
    error: featuresLoadError,
  } = useFeatures(currentProject);

  const initialFilter = React.useMemo(() => {
    const featureViewParam = searchParams.get('featureView');
    return featureViewParam ? { featureView: featureViewParam } : {};
  }, [searchParams]);

  const emptyState = (
    <FeatureStoreEmptyState resourceTypeSingular="feature" resourceTypePlural="features" />
  );

  return (
    <ApplicationsPage
      empty={features.features.length === 0}
      emptyStatePage={emptyState}
      loadErrorPage={
        <FeatureStoreAccessDenied resourceType="features" projectName={currentProject} />
      }
      title={
        <FeatureStorePageTitle
          title={
            <FeatureStoreObjectIcon
              objectType="feature"
              title={title}
              showBackground
              useTypedColors
            />
          }
        />
      }
      description={description}
      loadError={featuresLoadError}
      loaded={featuresLoaded}
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
      <FeaturesList
        features={features.features}
        fsProject={currentProject}
        initialFilter={initialFilter}
      />
    </ApplicationsPage>
  );
};

export default Features;
