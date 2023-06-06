import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';
import {
  InferenceMetricType,
  ModelServingMetricsContext,
} from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { TimeframeTitle } from '~/pages/modelServing/screens/types';
import { per100 } from './utils';

const InferenceGraphs: React.FC = () => {
  const { data, currentTimeframe } = React.useContext(ModelServingMetricsContext);

  const inHours =
    currentTimeframe === TimeframeTitle.ONE_HOUR || currentTimeframe === TimeframeTitle.ONE_DAY;

  return (
    <Stack hasGutter>
      <StackItem>
        <MetricsChart
          metrics={[
            {
              name: 'Success http requests (x100)',
              metric: data[InferenceMetricType.REQUEST_COUNT_SUCCESS],
              translatePoint: per100,
            },
            {
              name: 'Failed http requests (x100)',
              metric: data[InferenceMetricType.REQUEST_COUNT_FAILED],
              // translatePoint: (point) => {
              //   // TODO: remove when real values are used
              //   const newPoint = per100(point);
              //   const y = Math.floor(newPoint.y / (Math.floor(Math.random() * 2) + 2));
              //   return { ...newPoint, y };
              // },
            },
          ]}
          title={`Http requests per ${inHours ? 'hour' : 'day'} (x100)`}
        />
      </StackItem>
    </Stack>
  );
};

export default InferenceGraphs;
