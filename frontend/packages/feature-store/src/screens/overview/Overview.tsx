import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import OverviewTabs from './OverviewTabs';
import FeatureStoreProjectSelectorNavigator from '../components/FeatureStoreProjectSelectorNavigator';
import { featureStoreRoute } from '../../routes';

const title = 'Feature store';
const description =
  'A catalog of features, entities, feature views and datasets created by your team';

const Overview = (): React.ReactElement => (
  <ApplicationsPage
    empty={false}
    emptyStatePage={<></>}
    title={title}
    description={description}
    loadError={undefined}
    loaded
    headerContent={
      <FeatureStoreProjectSelectorNavigator
        getRedirectPath={(featureStoreObject, featureStoreProject) =>
          featureStoreRoute(featureStoreObject, featureStoreProject)
        }
      />
    }
  >
    <OverviewTabs />
  </ApplicationsPage>
);

export default Overview;
