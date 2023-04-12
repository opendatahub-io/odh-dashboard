import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, Tab, TabTitleText } from '@patternfly/react-core';
import PerformanceTab from './PerformanceTab';
import BiasTab from './BiasTab';
import './MetricsPageTabs.scss';

const MetricsPageTabs: React.FC = () => {
  const DEFAULT_TAB = 'performance';

  const { tab } = useParams();
  const navigate = useNavigate();

  //Works to select default tab
  React.useEffect(() => {
    if (!tab) {
      navigate(`./${DEFAULT_TAB}`, { replace: true });
    }
  }, [navigate, tab]);

  const loadTab = (tabId: string) => {
    navigate(`../${tabId}`, { relative: 'path' });
  };

  const handleTabClick = (
    event: React.MouseEvent<HTMLElement> | React.KeyboardEvent | MouseEvent,
    tabId: string | number,
  ) => {
    loadTab(String(tabId));
  };

  return (
    <Tabs
      activeKey={tab}
      onSelect={handleTabClick}
      isBox={false}
      aria-label="Metrics page tabs"
      role="region"
      className="odh-tabs-fix"
    >
      <Tab
        eventKey="performance"
        title={<TabTitleText>Performance</TabTitleText>}
        aria-label="Performance tab"
        className="odh-tabcontent-fix"
      >
        <PerformanceTab />
      </Tab>
      <Tab
        eventKey="bias"
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
