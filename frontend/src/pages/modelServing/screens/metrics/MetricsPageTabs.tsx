import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tab, TabAction, Tabs, TabTitleText } from '@patternfly/react-core';
import { MetricsTabKeys } from '~/pages/modelServing/screens/metrics/types';
import { useExplainabilityModelData } from '~/concepts/explainability/useExplainabilityModelData';
import NotFound from '~/pages/NotFound';
import useDoesTrustyAICRExist from '~/concepts/explainability/useDoesTrustyAICRExist';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import PerformanceTab from './PerformanceTab';
import BiasTab from './BiasTab';
import BiasConfigurationAlertPopover from './BiasConfigurationAlertPopover';
import useMetricsPageEnabledTabs from './useMetricsPageEnabledTabs';

import './MetricsPageTabs.scss';

const MetricsPageTabs: React.FC = () => {
  const enabledTabs = useMetricsPageEnabledTabs();
  const { biasMetricConfigs, loaded } = useExplainabilityModelData();

  const [biasMetricsInstalled] = useDoesTrustyAICRExist();
  const performanceMetricsAreaAvailable = useIsAreaAvailable(
    SupportedArea.PERFORMANCE_METRICS,
  ).status;

  const { tab } = useParams<{ tab: MetricsTabKeys }>();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!tab) {
      navigate(`./${enabledTabs[0]}`, { replace: true });
    } else if (!enabledTabs.includes(tab)) {
      navigate(`../${enabledTabs[0]}`, { replace: true });
    }
  }, [enabledTabs, navigate, tab]);

  if (enabledTabs.length === 0) {
    return <NotFound />;
  }

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
      {performanceMetricsAreaAvailable && (
        <Tab
          eventKey={MetricsTabKeys.PERFORMANCE}
          title={<TabTitleText>Endpoint performance</TabTitleText>}
          aria-label="Performance tab"
          className="odh-tabcontent-fix"
        >
          <PerformanceTab />
        </Tab>
      )}
      {biasMetricsInstalled && (
        <Tab
          eventKey={MetricsTabKeys.BIAS}
          title={<TabTitleText>Model bias</TabTitleText>}
          aria-label="Bias tab"
          className="odh-tabcontent-fix"
          actions={
            loaded &&
            biasMetricConfigs.length === 0 && (
              <TabAction>
                <BiasConfigurationAlertPopover
                  onConfigure={() => {
                    navigate('../configure', { relative: 'path' });
                  }}
                />
              </TabAction>
            )
          }
        >
          <BiasTab />
        </Tab>
      )}
    </Tabs>
  );
};

export default MetricsPageTabs;
