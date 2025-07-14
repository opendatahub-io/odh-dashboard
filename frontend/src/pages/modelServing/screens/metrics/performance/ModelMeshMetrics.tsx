import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import MetricsChart from '#~/pages/modelServing/screens/metrics/MetricsChart';
import {
  ModelMetricType,
  ModelServingMetricsContext,
} from '#~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import EnsureMetricsAvailable from '#~/pages/modelServing/screens/metrics/EnsureMetricsAvailable';

const ModelMeshMetrics: React.FC = () => {
  const { data } = React.useContext(ModelServingMetricsContext);

  return (
    <Stack hasGutter>
      <EnsureMetricsAvailable
        metrics={[ModelMetricType.REQUEST_COUNT_SUCCESS, ModelMetricType.REQUEST_COUNT_FAILED]}
        accessDomain="model metrics"
      >
        <StackItem>
          <MetricsChart
            metrics={[
              {
                name: 'Successful',
                metric: data[ModelMetricType.REQUEST_COUNT_SUCCESS],
              },
              {
                name: 'Failed',
                metric: data[ModelMetricType.REQUEST_COUNT_FAILED],
              },
            ]}
            color="blue"
            title="HTTP requests per 5 minutes"
            isStack
          />
        </StackItem>
      </EnsureMetricsAvailable>
    </Stack>
  );
};

export default ModelMeshMetrics;
