import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { Tab, Tabs, TabTitleText, TabContent, PageSection, Flex } from '@patternfly/react-core';
import {
  LineageCenterProvider,
  useLineageCenter,
} from '@odh-dashboard/internal/components/lineage/context/LineageCenterContext';
import FeatureStoreProjectSelectorNavigator from './screens/components/FeatureStoreProjectSelectorNavigator';
import FeatureStorePageTitle from './components/FeatureStorePageTitle';
import FeatureStoreWarningAlert from './components/FeatureStoreWarningAlert';
import { featureStoreRoute } from './routes';
import { FeatureStoreTabs } from './const';
import Metrics from './screens/metrics/Metrics';
import FeatureStoreLineage from './screens/lineage/FeatureStoreLineage';
import FeatureStoreObjectIcon from './components/FeatureStoreObjectIcon';

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
const FeatureStoreInner: React.FC<FeatureStoreProps> = ({ ...pageProps }) => {
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(FeatureStoreTabs.METRICS);
  const { triggerCenter } = useLineageCenter();

  // Trigger centering when lineage tab becomes active
  React.useEffect(() => {
    if (activeTabKey === FeatureStoreTabs.LINEAGE) {
      triggerCenter();
    }
  }, [activeTabKey, triggerCenter]);

  return (
    <ApplicationsPage
      {...pageProps}
      title={
        <FeatureStorePageTitle
          title={
            <FeatureStoreObjectIcon
              objectType="feature_store"
              title="Feature store overview"
              showBackground
              useTypedColors
            />
          }
        />
      }
      headerContent={
        <Flex direction={{ default: 'column' }}>
          <FeatureStoreWarningAlert />
          <FeatureStoreProjectSelectorNavigator
            getRedirectPath={(featureStoreObject, featureStoreProject) =>
              `${featureStoreRoute(featureStoreObject, featureStoreProject)}`
            }
          />
        </Flex>
      }
      loaded
    >
      <PageSection
        hasBodyWrapper={false}
        style={{ height: '100%', minHeight: '600px' }}
        padding={{ default: 'noPadding' }}
      >
        <Tabs
          activeKey={activeTabKey}
          onSelect={(e, tabIndex) => {
            setActiveTabKey(tabIndex);
          }}
          aria-label="Overview page"
          role="region"
          data-testid="feature-store-page"
        >
          <Tab
            eventKey={FeatureStoreTabs.METRICS}
            title={<TabTitleText>Metrics</TabTitleText>}
            aria-label="Metrics tab"
            data-testid="metrics-tab"
            tabContentId={`tabContent-${FeatureStoreTabs.METRICS}`}
          >
            <TabContent
              id={`tabContent-${FeatureStoreTabs.METRICS}`}
              eventKey={FeatureStoreTabs.METRICS}
              activeKey={activeTabKey}
              hidden={FeatureStoreTabs.METRICS !== activeTabKey}
              style={{ height: '100%' }}
            >
              <Metrics />
            </TabContent>
          </Tab>
          <Tab
            eventKey={FeatureStoreTabs.LINEAGE}
            title={<TabTitleText>Lineage</TabTitleText>}
            aria-label="Lineage tab"
            data-testid="lineage-tab"
            tabContentId={`tabContent-${FeatureStoreTabs.LINEAGE}`}
          />
        </Tabs>
        <TabContent
          id={`tabContent-${FeatureStoreTabs.LINEAGE}`}
          eventKey={FeatureStoreTabs.LINEAGE}
          activeKey={activeTabKey}
          hidden={FeatureStoreTabs.LINEAGE !== activeTabKey}
          style={{ height: '100%' }}
        >
          <FeatureStoreLineage />
        </TabContent>
      </PageSection>
    </ApplicationsPage>
  );
};

const FeatureStore: React.FC<FeatureStoreProps> = (props) => {
  return (
    <LineageCenterProvider>
      <FeatureStoreInner {...props} />
    </LineageCenterProvider>
  );
};

export default FeatureStore;
