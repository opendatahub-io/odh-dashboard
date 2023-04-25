import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, Tab, TabTitleText } from '@patternfly/react-core';
import { MetricsTabKeys } from '~/pages/modelServing/screens/metrics/types';
import PerformanceTab from './PerformanceTab';
import BiasTab from './BiasTab';
import './MetricsPageTabs.scss';

const MetricsPageTabs: React.FC = () => {
  const DEFAULT_TAB = MetricsTabKeys.PERFORMANCE;

  const { tab } = useParams();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!tab) {
      navigate(`./${DEFAULT_TAB}`, { replace: true });
    }
  }, [DEFAULT_TAB, navigate, tab]);

  return (
    <Tabs
      activeKey={tab}
      onSelect={(event, tabId) => {
        if (typeof tabId === 'string') {
          navigate(`../${tabId}`, { relative: 'path' });
        }
      }}
      isBox={false}
      aria-label="Metrics page tabs"
      role="region"
      className="odh-tabs-fix"
    >
      <Tab
        eventKey={MetricsTabKeys.PERFORMANCE}
        title={<TabTitleText>Performance</TabTitleText>}
        aria-label="Performance tab"
        className="odh-tabcontent-fix"
      >
        <PerformanceTab />
      </Tab>
      <Tab
        eventKey={MetricsTabKeys.BIAS}
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
