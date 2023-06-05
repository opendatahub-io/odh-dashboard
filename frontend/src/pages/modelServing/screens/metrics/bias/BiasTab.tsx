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
import { byId } from '~/pages/modelServing/screens/metrics/utils';

// const byId =
//   <T extends { id: string | number }>(id: T['id']) =>
//   (obj: T) =>
//     obj.id === id;
//
// function getProperty<Type, Key extends keyof Type>(obj: Type, key: Key) {
//   return obj[key];
// }
// const byProp =
//   <T, K extends keyof T>(prop: K, value: T[K]) =>
//   (obj: T) =>
//     obj[prop] === value;

// type ObjOrId<T> = T extends { id: string | number } ? T : string | number;
//
//
// const byId4 = <T,>(arg: ObjOrId<T>) =>

// const byId2 = <T extends { id: string | number }, U extends string ? T['id'] : T>(id: T | T['id']) => {
//   return (obj: T) =>
// };

const BiasTab = () => {
  const { biasMetricConfigs, loaded } = useExplainabilityModelData();
  const [selectedBiasConfigs, setSelectedBiasConfigs] = React.useState<BiasMetricConfig[]>([]);

  const selectBiasConfigCallback = React.useCallback(setSelectedBiasConfigs, [
    setSelectedBiasConfigs,
  ]);

  selectedBiasConfigs.filter(byProp('favorableOutcome', selectedBiasConfigs[0].favorableOutcome));
  selectedBiasConfigs.filter(byId(selectedBiasConfigs[1].id));

  selectedBiasConfigs.filter((x) => x.id === selectedBiasConfigs[1].id);

  [{ id: 'hello' }].filter(byId5(5));

  const charts = React.useMemo(() => {
    if (!loaded) {
      return [];
    }
    return selectedBiasConfigs.map(translate);
  }, [loaded, selectedBiasConfigs]);

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  // if (charts.length === 0) {
  //   return (
  //     <Bullseye>
  //       <h1>No Charts Selected</h1>
  //     </Bullseye>
  //   );
  // }

  return (
    //
    <Stack>
      <StackItem>
        <MetricsPageToolbar
          leftToolbarItem={
            <ToolbarItem>
              <ToolbarItem variant="label">Metrics to display</ToolbarItem>
              <ToolbarItem>
                <BiasMetricConfigSelector onChange={selectBiasConfigCallback} />
              </ToolbarItem>
            </ToolbarItem>
          }
        />
      </StackItem>
      <PageSection isFilled>
        <Stack hasGutter>
          {charts.map((chart) => (
            <StackItem key={chart.id}>
              <BiasMetricChartWrapper name={chart.name}>
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

//TODO: quick hack remove when fixed.
const translate = (biasMetricConfig: BiasMetricConfig): ChartData => {
  console.log('ChartData:', biasMetricConfig);
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
