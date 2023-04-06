import React from 'react';
import { Tabs, Tab, TabTitleText } from '@patternfly/react-core';
import PerformanceTab from './PerformanceTab';
import BiasTab from './BiasTab';
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
      aria-label="Metrics page tabs"
      role="region"
      className="odh-tabs-fix"
    >
      <Tab
        eventKey={0}
        title={<TabTitleText>Performance</TabTitleText>}
        aria-label="Performance tab"
        className="odh-tabcontent-fix"
      >
        <PerformanceTab />
      </Tab>
      <Tab
        eventKey={1}
        title={<TabTitleText>Bias</TabTitleText>}
        aria-label="Bias tab"
        className="odh-tabcontent-fix"
      >
        <BiasTab />
      </Tab>
    </Tabs>
  );
};

export default MetricsPageTabs;
