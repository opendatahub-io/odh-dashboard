import React from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Tab, TabAction, Tabs, TabTitleText } from '@patternfly/react-core';
import { MetricsTabKeys } from '~/pages/modelServing/screens/metrics/types';
import { useModelBiasData } from '~/concepts/trustyai/context/useModelBiasData';
import NotFound from '~/pages/NotFound';
import useDoesTrustyAICRExist from '~/concepts/trustyai/context/useDoesTrustyAICRExist';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { InferenceServiceKind } from '~/k8sTypes';
import PerformanceTab from './performance/PerformanceTab';
import BiasTab from './bias/BiasTab';
import BiasConfigurationAlertPopover from './bias/BiasConfigurationPage/BiasConfigurationAlertPopover';
import useMetricsPageEnabledTabs from './useMetricsPageEnabledTabs';

import './MetricsPageTabs.scss';

type MetricsPageTabsProps = {
  model: InferenceServiceKind;
};

const MetricsPageTabs: React.FC<MetricsPageTabsProps> = ({ model }) => {
  const enabledTabs = useMetricsPageEnabledTabs();
  const { biasMetricConfigs, loaded } = useModelBiasData();
  const [biasMetricsInstalled] = useDoesTrustyAICRExist();
  const performanceMetricsAreaAvailable = useIsAreaAvailable(
    SupportedArea.PERFORMANCE_METRICS,
  ).status;
  const { tab } = useParams<{ tab: MetricsTabKeys }>();
  const navigate = useNavigate();

  if (!tab) {
    return <Navigate to={`./${enabledTabs[0]}`} replace />;
  }

  if (!enabledTabs.includes(tab)) {
    return <Navigate to={`../${enabledTabs[0]}`} replace />;
  }

  if (enabledTabs.length === 0) {
    return <NotFound />;
  }

  if (enabledTabs.length === 1) {
    return performanceMetricsAreaAvailable ? <PerformanceTab model={model} /> : <BiasTab />;
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
      className="odh-metrics-page-tabs"
      mountOnEnter
    >
      {performanceMetricsAreaAvailable && (
        <Tab
          eventKey={MetricsTabKeys.PERFORMANCE}
          title={<TabTitleText>Endpoint performance</TabTitleText>}
          aria-label="Performance tab"
          className="odh-metrics-page-tabs__content"
          data-testid="performance-tab"
        >
          <PerformanceTab model={model} />
        </Tab>
      )}
      {biasMetricsInstalled && (
        <Tab
          eventKey={MetricsTabKeys.BIAS}
          title={<TabTitleText>Model bias</TabTitleText>}
          aria-label="Bias tab"
          className="odh-metrics-page-tabs__content"
          data-testid="bias-tab"
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
