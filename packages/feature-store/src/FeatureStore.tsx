import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import FeatureStoreProjectSelectorNavigator from './screens/components/FeatureStoreProjectSelectorNavigator';
import { featureStoreRoute } from './routes';
import { FeatureStoreTabs } from './const';
import Metrics from './screens/metrics/Metrics';

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
const FeatureStore: React.FC<FeatureStoreProps> = ({ ...pageProps }) => {
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(FeatureStoreTabs.METRICS);

  return (
    <ApplicationsPage
      {...pageProps}
      title="Overview"
      description="Description of feature store"
      headerContent={
        <FeatureStoreProjectSelectorNavigator
          getRedirectPath={(featureStoreObject, featureStoreProject) =>
            `${featureStoreRoute(featureStoreObject, featureStoreProject)}`
          }
        />
      }
      loaded
      provideChildrenPadding
    >
      <Tabs
        activeKey={activeTabKey}
        aria-label="Feature store page"
        role="region"
        data-testid="feature-store-page"
        onSelect={(e, tabIndex) => {
          setActiveTabKey(tabIndex);
        }}
      >
        <Tab
          eventKey={FeatureStoreTabs.METRICS}
          title={<TabTitleText>{FeatureStoreTabs.METRICS}</TabTitleText>}
          aria-label="Metrics tab"
          data-testid="metrics-tab"
        >
          <PageSection hasBodyWrapper={false} isFilled data-testid="metrics-tab-content">
            <Metrics />
          </PageSection>
        </Tab>
        <Tab
          eventKey={FeatureStoreTabs.LINEAGE}
          title={<TabTitleText>{FeatureStoreTabs.LINEAGE}</TabTitleText>}
          aria-label="Lineage tab"
          data-testid="lineage-tab"
        >
          <PageSection
            hasBodyWrapper={false}
            isFilled
            data-testid="lineage-tab-content"
            className="pf-v6-u-mt-xl"
          >
            lineage
          </PageSection>
        </Tab>
      </Tabs>
    </ApplicationsPage>
  );
};

export default FeatureStore;
