import React from 'react';
import { Tabs, Tab, TabTitleText } from '@patternfly/react-core';
import PerformanceTab from './PerformanceTab';
import QualityTab from './QualityTab';
import './MetricsPageTabs.scss';

const MetricsPageTabs: React.FC = () => {
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(0);

  // Toggle currently active tab
  const handleTabClick = (
    event: React.MouseEvent<HTMLElement> | React.KeyboardEvent | MouseEvent,
    tabIndex: string | number,
  ) => {
    setActiveTabKey(tabIndex);
  };

  return (
    <Tabs
      activeKey={activeTabKey}
      onSelect={handleTabClick}
      isBox={false}
      aria-label="Tabs in the metrics page"
      role="region"
    >
      <Tab
        eventKey={0}
        title={<TabTitleText>Performance</TabTitleText>}
        aria-label="Default content - performance"
        className="odh-tabcontent-fix"
      >
        <PerformanceTab />
      </Tab>
      <Tab eventKey={1} title={<TabTitleText>Quality</TabTitleText>} className="odh-tabcontent-fix">
        <QualityTab />
      </Tab>
    </Tabs>
  );
};

export default MetricsPageTabs;
