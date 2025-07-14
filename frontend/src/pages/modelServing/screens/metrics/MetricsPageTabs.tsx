import React from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Tab, TabAction, Tabs, TabTitleText } from '@patternfly/react-core';
import { MetricsTabKeys } from '#~/pages/modelServing/screens/metrics/types';
import { useModelBiasData } from '#~/concepts/trustyai/context/useModelBiasData';
import NotFound from '#~/pages/NotFound';
import useDoesTrustyAICRExist from '#~/concepts/trustyai/context/useDoesTrustyAICRExist';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { InferenceServiceKind } from '#~/k8sTypes';
import { TrustyInstallState } from '#~/concepts/trustyai/types';
import './MetricsPageTabs.scss';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import { isProjectNIMSupported } from '#~/pages/modelServing/screens/projects/nimUtils';
import useMetricsPageEnabledTabs from './useMetricsPageEnabledTabs';
import BiasConfigurationAlertPopover from './bias/BiasConfigurationPage/BiasConfigurationAlertPopover';
import PerformanceTab from './performance/PerformanceTab';
import BiasTab from './bias/BiasTab';
import NIMTab from './nim/NimTab';

type MetricsPageTabsProps = {
  model: InferenceServiceKind;
};

const MetricsPageTabs: React.FC<MetricsPageTabsProps> = ({ model }) => {
  const servingPlatformStatuses = useServingPlatformStatuses();
  const isNIMAvailable = servingPlatformStatuses.kServeNIM.enabled;
  const { projects } = React.useContext(ProjectsContext);
  const project = projects.find(byName(model.metadata.namespace));
  const enabledTabs = useMetricsPageEnabledTabs();
  const isKServeNIMEnabled = project ? isProjectNIMSupported(project) : false;
  const isNimEnabled = isNIMAvailable && isKServeNIMEnabled;
  const { biasMetricConfigs, statusState } = useModelBiasData();
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

  //Display only one tab that is available
  if (enabledTabs.length === 1) {
    if (performanceMetricsAreaAvailable) {
      return <PerformanceTab model={model} />;
    }
    if (isNimEnabled) {
      return <NIMTab model={model} />;
    }

    return <BiasTab />;
  }

  //Display multiple available tabs
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

      {/* Add NIN metrics tab */}
      {isNimEnabled && (
        <Tab
          eventKey={MetricsTabKeys.NIM}
          title={<TabTitleText>NIM Metrics</TabTitleText>}
          aria-label="Nim tab"
          className="odh-metrics-page-tabs__content"
          data-testid="nim-tab"
        >
          <NIMTab model={model} />
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
            statusState.type === TrustyInstallState.INSTALLED &&
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
