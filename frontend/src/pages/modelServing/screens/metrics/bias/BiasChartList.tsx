import React from 'react';
import { Bullseye, Spinner, StackItem } from '@patternfly/react-core';
import { useExplainabilityModelData } from '~/concepts/explainability/useExplainabilityModelData';
import BiasMetricChartWrapper from '~/pages/modelServing/screens/metrics/bias/BiasMetricChartWrapper';
import { InferenceMetricType } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import TrustyChart, {
  TrustyChartProps,
} from '~/pages/modelServing/screens/metrics/bias/TrustyChart';
import {
  DEFAULT_MAX_THRESHOLD,
  DEFAULT_MIN_THRESHOLD,
  PADDING,
} from '~/pages/modelServing/screens/metrics/bias/const';
import { BiasMetricConfig } from '~/concepts/explainability/types';
import { DomainCalculator, MetricsChartTypes } from '~/pages/modelServing/screens/metrics/types';
import BiasMetricConfigSelector from '~/pages/modelServing/screens/metrics/bias/BiasMetricConfigSelector';

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

  if (biasMetricConfig.metricType.toString() === 'SPD') {
    title = 'Statistical Parity Difference';
    metricType = InferenceMetricType.TRUSTY_AI_SPD;
    abbreviation = 'SPD';
  } else if (biasMetricConfig.metricType.toString() === 'DIR') {
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

const BiasChartList = () => {
  const { biasMetricConfigs, loaded } = useExplainabilityModelData();
  const charts = React.useMemo(() => {
    if (!loaded) {
      return [];
    }
    return biasMetricConfigs.map(translate);
  }, [biasMetricConfigs, loaded]);

  // const chartData: Record<string, ChartData> = React.useMemo(
  //   () =>
  //     biasMetricConfigs.reduce((prev, current) => {
  //       prev[current.id] = current;
  //       return prev;
  //     }, {}),
  //   [biasMetricConfigs],
  // );

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <>
      <StackItem>
        <BiasMetricConfigSelector />
      </StackItem>
      <StackItem>
        {/*{biasMetricConfigs.map((config) => (*/}
        {/*  <BiasMetricChartWrapper key={config.id} name={config.name}>*/}
        {/*    <TrustyChart*/}
        {/*      title="Statistical Parity Difference"*/}
        {/*      abbreviation={config.metricType.toString()}*/}
        {/*      metricType={translateType(config.metricType)}*/}
        {/*      domain={(maxYValue) => ({*/}
        {/*        y:*/}
        {/*          maxYValue > DEFAULT_MAX_THRESHOLD*/}
        {/*            ? [-1 * maxYValue - PADDING, maxYValue + PADDING]*/}
        {/*            : [DEFAULT_MIN_THRESHOLD - PADDING, DEFAULT_MAX_THRESHOLD + PADDING],*/}
        {/*      })}*/}
        {/*      thresholds={[DEFAULT_MAX_THRESHOLD, DEFAULT_MIN_THRESHOLD]}*/}
        {/*    />*/}
        {/*  </BiasMetricChartWrapper>*/}
        {/*))}*/}
        {charts.map((chart) => (
          <BiasMetricChartWrapper key={chart.id} name={chart.name}>
            <TrustyChart
              id={chart.id}
              title={chart.title}
              abbreviation={chart.abbreviation}
              metricType={chart.metricType}
              thresholds={chart.thresholds}
              domain={chart.domain}
            />
          </BiasMetricChartWrapper>
        ))}
      </StackItem>
    </>
  );
};

export default BiasChartList;
