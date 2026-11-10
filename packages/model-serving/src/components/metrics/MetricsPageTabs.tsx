import React from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Bullseye,
  Spinner,
  Tab,
  TabAction,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { useModelBiasData } from '@odh-dashboard/trustyai/hooks/useModelBiasData';
import NotFound from '@odh-dashboard/ui-core/components/NotFound';
import useDoesTrustyAICRExist from '@odh-dashboard/trustyai/hooks/useDoesTrustyAICRExist';
import { TrustyInstallState } from '@odh-dashboard/trustyai/types';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import './MetricsPageTabs.scss';
import { MetricsTabKeys } from './types';
import useMetricsPageEnabledTabs from './useMetricsPageEnabledTabs';
import BiasConfigurationAlertPopover from './bias/BiasConfigurationPage/BiasConfigurationAlertPopover';
import PerformanceTab from './performance/PerformanceTab';
import BiasTab from './bias/BiasTab';
import NIMTab from './nim/NimTab';

type MetricsPageTabsProps = {
  model: InferenceServiceKind;
};

const MetricsPageTabs: React.FC<MetricsPageTabsProps> = ({ model }) => {
  const { enabledTabs, loading, error } = useMetricsPageEnabledTabs(model);
  const { biasMetricConfigs, statusState } = useModelBiasData();
  const [biasMetricsInstalled] = useDoesTrustyAICRExist();
  const { tab } = useParams<{ tab: MetricsTabKeys }>();
  const navigate = useNavigate();

  if (error) {
    return (
      <Alert
        isInline
        variant="danger"
        title="Unable to determine available metrics tabs"
        data-testid="metrics-tabs-error"
      >
        {error.message} Contact your project administrator if access is restricted.
      </Alert>
    );
  }

  if ((tab && !enabledTabs.includes(tab)) || enabledTabs.length === 0) {
    if (loading) {
      return (
        <Bullseye>
          <Spinner aria-label="Loading available metrics tabs" />
        </Bullseye>
      );
    }
  }

  if (enabledTabs.length === 0) {
    return <NotFound />;
  }

  if (!tab) {
    return <Navigate to={`./${enabledTabs[0]}`} replace />;
  }

  if (!enabledTabs.includes(tab)) {
    return <Navigate to={`../${enabledTabs[0]}`} replace />;
  }

  //Display only one tab that is available
  if (enabledTabs.length === 1) {
    if (enabledTabs.includes(MetricsTabKeys.PERFORMANCE)) {
      return <PerformanceTab model={model} />;
    }
    if (enabledTabs.includes(MetricsTabKeys.NIM)) {
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
      {enabledTabs.includes(MetricsTabKeys.PERFORMANCE) && (
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

      {enabledTabs.includes(MetricsTabKeys.NIM) && (
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
