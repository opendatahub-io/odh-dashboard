import {
  FlexItem,
  Flex,
  Tab,
  TabContentBody,
  Tabs,
  TabTitleText,
  TabContent,
  PageSection,
} from '@patternfly/react-core';
import * as React from 'react';
import { Lineage } from '@odh-dashboard/internal/components/lineage/Lineage';

enum OverviewTab {
  METRICS = 'metrics',
  LINEAGE = 'lineage',
}

const OverviewTabs: React.FC = () => {
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(OverviewTab.LINEAGE);

  return (
    <PageSection
      hasBodyWrapper={false}
      isFilled
      padding={{ default: 'noPadding' }}
      style={{ height: '100%', minHeight: '600px' }}
    >
      <Flex
        direction={{ default: 'column' }}
        style={{ height: '100%' }}
        spaceItems={{ default: 'spaceItemsNone' }}
      >
        <FlexItem>
          <Tabs
            activeKey={activeTabKey}
            onSelect={(e, tabIndex) => {
              setActiveTabKey(tabIndex);
            }}
            aria-label="Overview page"
            role="region"
            data-testid="overview-page"
          >
            <Tab
              eventKey={OverviewTab.METRICS}
              title={<TabTitleText>Metrics</TabTitleText>}
              aria-label="Metrics tab"
              data-testid="metrics-tab"
              tabContentId={`tabContent-${OverviewTab.METRICS}`}
            />
            <Tab
              eventKey={OverviewTab.LINEAGE}
              title={<TabTitleText>Lineage</TabTitleText>}
              aria-label="Lineage tab"
              data-testid="lineage-tab"
              tabContentId={`tabContent-${OverviewTab.LINEAGE}`}
            />
          </Tabs>
        </FlexItem>
        <FlexItem flex={{ default: 'flex_1' }} style={{ overflowY: 'hidden' }}>
          <TabContent
            id={`tabContent-${OverviewTab.METRICS}`}
            eventKey={OverviewTab.METRICS}
            activeKey={activeTabKey}
            hidden={OverviewTab.METRICS !== activeTabKey}
            className="pf-v6-u-h-100"
          >
            <TabContentBody className="pf-v6-u-h-100">Metrics content will go here</TabContentBody>
          </TabContent>
          <TabContent
            id={`tabContent-${OverviewTab.LINEAGE}`}
            eventKey={OverviewTab.LINEAGE}
            activeKey={activeTabKey}
            hidden={OverviewTab.LINEAGE !== activeTabKey}
            className="pf-v6-u-h-100"
          >
            <Lineage />
          </TabContent>
        </FlexItem>
      </Flex>
    </PageSection>
  );
};

export default OverviewTabs;
