import React from 'react';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { featureStoreRoute } from './FeatureStoreRoutes';
import FeatureStoreProjectSelectorNavigator from './screens/FeatureStoreProjectSelectorNavigator';

type FeatureStoreProps = Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  | 'title'
  | 'description'
  | 'loadError'
  | 'loaded'
  | 'provideChildrenPadding'
  | 'removeChildrenTopPadding'
  | 'headerContent'
>;
const FeatureStore: React.FC<FeatureStoreProps> = ({ ...pageProps }) => (
  <ApplicationsPage
    {...pageProps}
    title="Feature Store"
    description="A catalog of features, entities, feature views and datasets created by your own team"
    headerContent={
      <FeatureStoreProjectSelectorNavigator
        getRedirectPath={(featureStore) => `${featureStoreRoute(featureStore)}`}
      />
    }
    loaded
    provideChildrenPadding
  />
);

export default FeatureStore;
