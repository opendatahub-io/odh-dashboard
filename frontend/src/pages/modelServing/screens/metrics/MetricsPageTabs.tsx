import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, Tab, TabTitleText, Button } from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
import { MetricsTabKeys } from '~/pages/modelServing/screens/metrics/types';
import PerformanceTab from './PerformanceTab';
import BiasTab from './bias/BiasTab';
import './MetricsPageTabs.scss';

type MetricsPageTabsProps = {
  headerAction: (headerAction: React.ReactNode | null) => void;
};

const MetricsPageTabs: React.FC<MetricsPageTabsProps> = ({ headerAction }) => {
  const DEFAULT_TAB = MetricsTabKeys.PERFORMANCE;

  const { tab } = useParams();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!tab) {
      navigate(`./${DEFAULT_TAB}`, { replace: true });
    }

    if (tab === MetricsTabKeys.BIAS) {
      headerAction(
        <Button
          onClick={() => navigate(`../configure`, { relative: 'path' })}
          variant="link"
          icon={<CogIcon />}
          isInline
        >
          Configure
        </Button>,
      );
    } else {
      headerAction(null);
    }
  }, [DEFAULT_TAB, headerAction, navigate, tab]);

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
        title={<TabTitleText>Endpoint Performance</TabTitleText>}
        aria-label="Performance tab"
        className="odh-tabcontent-fix"
      >
        <PerformanceTab />
      </Tab>
      <Tab
        eventKey={MetricsTabKeys.BIAS}
        title={<TabTitleText>Model Bias</TabTitleText>}
        aria-label="Bias tab"
        className="odh-tabcontent-fix"
      >
        <BiasTab />
      </Tab>
    </Tabs>
  );
};

export default MetricsPageTabs;
