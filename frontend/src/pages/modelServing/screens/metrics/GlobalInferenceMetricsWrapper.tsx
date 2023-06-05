import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { MetricType } from '~/pages/modelServing/screens/types';
import { InferenceServiceKind } from '~/k8sTypes';
import InferenceMetricsPathWrapper from './InferenceMetricsPathWrapper';
import { ModelServingMetricsProvider } from './ModelServingMetricsContext';
import { getInferenceServiceMetricsQueries } from './utils';

export type GlobalInferenceMetricsOutletContextProps = {
  inferenceService: InferenceServiceKind;
  projectName: string;
};

const GlobalInferenceMetricsWrapper: React.FC = () => (
  <InferenceMetricsPathWrapper>
    {(inferenceService, projectName) => {
      const queries = getInferenceServiceMetricsQueries(inferenceService);
      return (
        <ModelServingMetricsProvider queries={queries} type={MetricType.INFERENCE}>
          <Outlet context={{ inferenceService, projectName }} />
        </ModelServingMetricsProvider>
      );
    }}
  </InferenceMetricsPathWrapper>
);

export default GlobalInferenceMetricsWrapper;
