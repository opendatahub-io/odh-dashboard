import React from 'react';
import {
  Bullseye,
  PageSection,
  Spinner,
  Stack,
  StackItem,
  ToolbarItem,
} from '@patternfly/react-core';
import MetricsPageToolbar from '~/pages/modelServing/screens/metrics/MetricsPageToolbar';
import BiasMetricConfigSelector from '~/pages/modelServing/screens/metrics/bias/BiasMetricConfigSelector';
import { BiasMetricConfig } from '~/concepts/explainability/types';
import { useExplainabilityModelData } from '~/concepts/explainability/useExplainabilityModelData';
import TrustyChart, {
  TrustyChartProps,
} from '~/pages/modelServing/screens/metrics/bias/TrustyChart';
import {
  DEFAULT_MAX_THRESHOLD,
  DEFAULT_MIN_THRESHOLD,
  PADDING,
} from '~/pages/modelServing/screens/metrics/bias/const';
import { DomainCalculator } from '~/pages/modelServing/screens/metrics/types';
import { InferenceMetricType } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { MetricTypes } from '~/api';
import BiasMetricChartWrapper from '~/pages/modelServing/screens/metrics/bias/BiasMetricChartWrapper';
import { useBrowserStorage } from '~/components/browserStorage';

const STORAGE_KEY = 'odh.dashboard.xai.selected_bias_charts';
const BiasTab: React.FC = () => {
  const { loaded } = useExplainabilityModelData();

  const [selectedBiasConfigs, setSelectedBiasConfigs] = useBrowserStorage<BiasMetricConfig[]>(
    STORAGE_KEY,
    [],
    true,
    true,
  );

  const charts = React.useMemo(() => selectedBiasConfigs.map(asChartData), [selectedBiasConfigs]);

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <Stack>
      <StackItem>
        <MetricsPageToolbar
          leftToolbarItem={
            <ToolbarItem>
              <ToolbarItem variant="label">Metrics to display</ToolbarItem>
              <ToolbarItem>
                <BiasMetricConfigSelector
                  onChange={setSelectedBiasConfigs}
                  initialSelections={selectedBiasConfigs}
                />
              </ToolbarItem>
            </ToolbarItem>
          }
        />
      </StackItem>
      <PageSection isFilled>
        <Stack hasGutter>
          {charts.map((chart) => (
            <StackItem key={chart.id}>
              <BiasMetricChartWrapper
                title={chart.name}
                storageKey={`bias-metric-chart-wrapper-${chart.id}`}
              >
                <TrustyChart
                  id={chart.id}
                  title={chart.title}
                  abbreviation={chart.abbreviation}
                  metricType={chart.metricType}
                  thresholds={chart.thresholds}
                  domain={chart.domain}
                />
              </BiasMetricChartWrapper>
            </StackItem>
          ))}
        </Stack>
      </PageSection>
    </Stack>
  );
};

type ChartData = {
  name: string;
  id: string;
} & TrustyChartProps;

//TODO: Add separate domain calcs.
const asChartData = (biasMetricConfig: BiasMetricConfig): ChartData => {
  const { id, name } = biasMetricConfig;
  const thresholds: [number, number] = [DEFAULT_MAX_THRESHOLD, DEFAULT_MIN_THRESHOLD];
  const domain: DomainCalculator = (maxYValue) => ({
    y:
      maxYValue > DEFAULT_MAX_THRESHOLD
        ? [-1 * maxYValue - PADDING, maxYValue + PADDING]
        : [DEFAULT_MIN_THRESHOLD - PADDING, DEFAULT_MAX_THRESHOLD + PADDING],
  });

  let title = '';
  let metricType = InferenceMetricType.TRUSTY_AI_DIR;
  let abbreviation = 'DEFAULT';

  if (biasMetricConfig.metricType === MetricTypes.SPD) {
    title = 'Statistical Parity Difference';
    metricType = InferenceMetricType.TRUSTY_AI_SPD;
    abbreviation = 'SPD';
  } else if (biasMetricConfig.metricType === MetricTypes.DIR) {
    title = 'Disparate Impact Ratio';
    metricType = InferenceMetricType.TRUSTY_AI_DIR;
    abbreviation = 'DIR';
  }

  return {
    id,
    name,
    title,
    metricType,
    abbreviation,
    thresholds,
    domain,
  };
};
export default BiasTab;
