import { PageSection, Tab, TabContentBody, Tabs, TabTitleText } from '@patternfly/react-core';
import * as React from 'react';
import { Lineage } from '@odh-dashboard/internal/components/lineage/Lineage';

const OverviewTab = {
  METRICS: 'metrics',
  LINEAGE: 'lineage',
};

const OverviewTabs: React.FC = () => {
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(OverviewTab.LINEAGE);

  return (
    <Tabs
      activeKey={activeTabKey}
      aria-label="Overview page"
      role="region"
      data-testid="overview-page"
      onSelect={(e, tabIndex) => {
        setActiveTabKey(tabIndex);
      }}
    >
      <Tab
        eventKey={OverviewTab.METRICS}
        title={<TabTitleText>{OverviewTab.METRICS}</TabTitleText>}
        aria-label="Metrics tab"
        data-testid="metrics-tab"
      >
        <TabContentBody>Metrics</TabContentBody>
      </Tab>
      <Tab
        eventKey={OverviewTab.LINEAGE}
        title={<TabTitleText>{OverviewTab.LINEAGE}</TabTitleText>}
        aria-label="Lineage tab"
        data-testid="lineage-tab"
      >
        <TabContentBody>
          <PageSection
            isFilled
            padding={{ default: 'noPadding' }}
            hasBodyWrapper={false}
            style={{ height: '90vh', width: '100%' }}
          >
            <Lineage />
          </PageSection>
        </TabContentBody>
      </Tab>
    </Tabs>
  );
};

export default OverviewTabs;
