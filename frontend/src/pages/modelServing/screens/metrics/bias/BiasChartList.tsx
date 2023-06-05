// import React from 'react';
// import { Bullseye, Spinner, StackItem } from '@patternfly/react-core';
// import { useExplainabilityModelData } from '~/concepts/explainability/useExplainabilityModelData';
// import BiasMetricChartWrapper from '~/pages/modelServing/screens/metrics/bias/BiasMetricChartWrapper';
// import { InferenceMetricType } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
// import TrustyChart, {
//   TrustyChartProps,
// } from '~/pages/modelServing/screens/metrics/bias/TrustyChart';
// import {
//   DEFAULT_MAX_THRESHOLD,
//   DEFAULT_MIN_THRESHOLD,
//   PADDING,
// } from '~/pages/modelServing/screens/metrics/bias/const';
// import { BiasMetricConfig } from '~/concepts/explainability/types';
// import { DomainCalculator } from '~/pages/modelServing/screens/metrics/types';
// import { MetricTypes } from '~/api';
//
// // type ChartData = {
// //   name: string;
// //   id: string;
// // } & TrustyChartProps;
// //
// // //TODO: quick hack remove when fixed.
// // const translate = (biasMetricConfig: BiasMetricConfig): ChartData => {
// //   console.log('ChartData:', biasMetricConfig);
// //   const { id, name } = biasMetricConfig;
// //   const thresholds: [number, number] = [DEFAULT_MAX_THRESHOLD, DEFAULT_MIN_THRESHOLD];
// //   const domain: DomainCalculator = (maxYValue) => ({
// //     y:
// //       maxYValue > DEFAULT_MAX_THRESHOLD
// //         ? [-1 * maxYValue - PADDING, maxYValue + PADDING]
// //         : [DEFAULT_MIN_THRESHOLD - PADDING, DEFAULT_MAX_THRESHOLD + PADDING],
// //   });
// //
// //   let title = '';
// //   let metricType = InferenceMetricType.TRUSTY_AI_DIR;
// //   let abbreviation = 'DEFAULT';
// //
// //   if (biasMetricConfig.metricType === MetricTypes.SPD) {
// //     title = 'Statistical Parity Difference';
// //     metricType = InferenceMetricType.TRUSTY_AI_SPD;
// //     abbreviation = 'SPD';
// //   } else if (biasMetricConfig.metricType === MetricTypes.DIR) {
// //     title = 'Disparate Impact Ratio';
// //     metricType = InferenceMetricType.TRUSTY_AI_DIR;
// //     abbreviation = 'DIR';
// //   }
// //
// //   return {
// //     id,
// //     name,
// //     title,
// //     metricType,
// //     abbreviation,
// //     thresholds,
// //     domain,
// //   };
// // };
//
// const BiasChartListProps;
// const BiasChartList = () => {
//   const { biasMetricConfigs, loaded } = useExplainabilityModelData();
//
//   //TODO useMemo may not be appropriate, investigate.
//   const charts = React.useMemo(() => {
//     if (!loaded) {
//       return [];
//     }
//     return biasMetricConfigs.map(translate);
//   }, [biasMetricConfigs, loaded]);
//
//   return (
//     <>
//       <StackItem>
//         {charts.map((chart) => (
//           <BiasMetricChartWrapper key={chart.id} name={chart.name}>
//             <TrustyChart
//               id={chart.id}
//               title={chart.title}
//               abbreviation={chart.abbreviation}
//               metricType={chart.metricType}
//               thresholds={chart.thresholds}
//               domain={chart.domain}
//             />
//           </BiasMetricChartWrapper>
//         ))}
//       </StackItem>
//     </>
//   );
// };
//
// export default BiasChartList;
