import * as React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Spinner,
} from '@patternfly/react-core';
import { CubesIcon, ErrorCircleOIcon } from '@patternfly/react-icons';
import { MetricsCommonContext } from '#~/concepts/metrics/MetricsCommonContext';
import useKserveMetricsConfigMap from '#~/concepts/metrics/kserve/useKserveMetricsConfigMap';
import useKserveMetricsGraphDefinitions from '#~/concepts/metrics/kserve/useKserveMetricsGraphDefinitions';
import useRefreshInterval from '#~/utilities/useRefreshInterval';
import { RefreshIntervalValue } from '#~/concepts/metrics/const';
import { RefreshIntervalTitle, TimeframeTitle } from '#~/concepts/metrics/types';
import { KserveMetricGraphDefinition } from '#~/concepts/metrics/kserve/types';
import { conditionalArea, SupportedArea } from '#~/concepts/areas';

type KserveMetricsContextProps = {
  namespace: string;
  timeframe: TimeframeTitle;
  refreshInterval: RefreshIntervalTitle;
  lastUpdateTime: number;
  graphDefinitions: KserveMetricGraphDefinition[];
};

export const KserveMetricsContext = React.createContext<KserveMetricsContextProps>({
  namespace: '',
  timeframe: TimeframeTitle.ONE_DAY,
  refreshInterval: RefreshIntervalTitle.FIVE_MINUTES,
  lastUpdateTime: 0,
  graphDefinitions: [],
});

type KserveMetricsContextProviderProps = {
  children: React.ReactNode;
  namespace: string;
  modelName: string;
};

export const KserveMetricsContextProvider = conditionalArea<KserveMetricsContextProviderProps>(
  SupportedArea.K_SERVE_METRICS,
  true,
)(({ children, namespace, modelName }) => {
  const { currentTimeframe, currentRefreshInterval, lastUpdateTime, setLastUpdateTime } =
    React.useContext(MetricsCommonContext);
  const [configMap, configMapLoaded, configMapError] = useKserveMetricsConfigMap(
    namespace,
    modelName,
  );
  const {
    graphDefinitions,
    error: graphDefinitionsError,
    loaded: graphDefinitionsLoaded,
    supported,
  } = useKserveMetricsGraphDefinitions(configMap);

  const loaded = configMapLoaded && graphDefinitionsLoaded;

  const error = graphDefinitionsError || configMapError;

  const refreshAllMetrics = React.useCallback(() => {
    setLastUpdateTime(Date.now());
  }, [setLastUpdateTime]);

  useRefreshInterval(RefreshIntervalValue[currentRefreshInterval], refreshAllMetrics);

  const contextValue = React.useMemo(
    () => ({
      namespace,
      lastUpdateTime,
      refreshInterval: currentRefreshInterval,
      timeframe: currentTimeframe,
      graphDefinitions,
    }),
    [currentRefreshInterval, currentTimeframe, graphDefinitions, lastUpdateTime, namespace],
  );

  if (error) {
    return (
      <EmptyState
        data-testid="kserve-unknown-error"
        headingLevel="h5"
        icon={ErrorCircleOIcon}
        titleText="Unknown error"
        variant={EmptyStateVariant.lg}
      >
        <EmptyStateBody>Error loading metrics configuration</EmptyStateBody>
      </EmptyState>
    );
  }

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!supported) {
    return (
      <EmptyState
        data-testid="kserve-metrics-runtime-unsupported"
        headingLevel="h4"
        icon={CubesIcon}
        titleText="Metrics not supported"
      >
        <EmptyStateBody>
          {modelName} is using a custom serving runtime. Metrics are only supported for models
          served via a pre-installed runtime when the single-model serving platform is enabled for a
          project.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <KserveMetricsContext.Provider value={contextValue}>{children}</KserveMetricsContext.Provider>
  );
});
