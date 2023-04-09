import React from 'react';
import _ from 'lodash';
import {
  InferenceMetricType,
  ModelServingMetricsContext,
} from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { DomainCalculator } from '~/pages/modelServing/screens/metrics/MetricsChart';
import TrustyChart from '~/pages/modelServing/screens/metrics/TrustyChart';
import { TrustyMetaData } from '~/pages/modelServing/screens/metrics/ScheduledMetricSelect';

const SPDGraph = () => {
  const { data } = React.useContext(ModelServingMetricsContext);
  const metric = {
    ...data[InferenceMetricType.TRUSTY_AI_SPD],
    data: data[InferenceMetricType.TRUSTY_AI_SPD].data[0]?.values, //map((x) => x?.[0]?.values || []),
  };

  const metadata: TrustyMetaData[] = data[InferenceMetricType.TRUSTY_AI_SPD].data.map(
    (payload) => ({
      protectedAttribute: payload.metric.protected,
      protectedValue: payload.metric.privileged,
      favorableOutput: payload.metric.outcome,
      favorableValue: payload.metric.favorable_value,
    }),
  );

  const metadataSet: TrustyMetaData[] = _.uniqWith(metadata, _.isEqual);

  // eslint-disable-next-line no-console
  console.log('Metadata: %O', metadata);
  // eslint-disable-next-line no-console
  console.log('MetadataSet: %O', metadataSet);
  // eslint-disable-next-line no-console
  console.log('SPD: %O', data[InferenceMetricType.TRUSTY_AI_SPD]);

  const domainCalc: DomainCalculator = (maxYValue) => ({
    y: maxYValue > 0.1 ? [-1 * maxYValue - 0.1, maxYValue + 0.1] : [-0.2, 0.2],
  });

  return (
    <TrustyChart
      title="Statistical Parity Difference (SPD)"
      metrics={{ name: 'SPD', metric }}
      metadata={metadataSet}
      domainCalc={domainCalc}
      threshold={0.1}
      minThreshold={-0.1}
    />
  );
};
export default SPDGraph;
