import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import {
  Tab,
  Tabs,
  TabTitleText,
  TabContent,
  Flex,
  FlexItem,
  PageSection,
} from '@patternfly/react-core';
import FeatureStoreProjectSelectorNavigator from './screens/components/FeatureStoreProjectSelectorNavigator';
import FeatureStorePageTitle from './components/FeatureStorePageTitle';
import { featureStoreRoute } from './routes';
import { FeatureStoreTabs } from './const';
import Metrics from './screens/metrics/Metrics';
import FeatureStoreLineage from './screens/lineage/FeatureStoreLineage';
import { useFeatureStoreProject } from './FeatureStoreContext';

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
  const { currentProject } = useFeatureStoreProject();

  return (
    <ApplicationsPage
      {...pageProps}
      title={
        <FeatureStorePageTitle title="Feature store" currentProject={currentProject ?? undefined} />
      }
      description="Description of feature store"
      headerContent={
        <FeatureStoreProjectSelectorNavigator
          getRedirectPath={(featureStoreObject, featureStoreProject) =>
            `${featureStoreRoute(featureStoreObject, featureStoreProject)}`
          }
        />
      }
      loaded
    >
      <PageSection
        hasBodyWrapper={false}
        isFilled
        padding={{ default: 'noPadding' }}
        style={{ height: '100%', minHeight: '600px' }}
      >
        <Flex direction={{ default: 'column' }} style={{ height: '100%' }}>
          <FlexItem>
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
          </FlexItem>
          <FlexItem flex={{ default: 'flex_1' }} style={{ overflowY: 'hidden' }}>
            <TabContent
              id={`tabContent-${FeatureStoreTabs.LINEAGE}`}
              eventKey={FeatureStoreTabs.LINEAGE}
              activeKey={activeTabKey}
              hidden={FeatureStoreTabs.LINEAGE !== activeTabKey}
              style={{ height: '100%' }}
            >
              <FeatureStoreLineage />
            </TabContent>
          </FlexItem>
        </Flex>
      </PageSection>
    </ApplicationsPage>
  );
};

export default FeatureStore;
