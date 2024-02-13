import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { PerformanceMetricType } from '~/pages/modelServing/screens/types';
import { InferenceServiceKind } from '~/k8sTypes';
import ModelMetricsPathWrapper from './ModelMetricsPathWrapper';
import { ModelServingMetricsProvider } from './ModelServingMetricsContext';
import { getModelMetricsQueries } from './utils';

export type GlobalModelMetricsOutletContextProps = {
  model: InferenceServiceKind;
  projectName: string;
};

const GlobalModelMetricsWrapper: React.FC = () => (
  <ModelMetricsPathWrapper>
    {(model, projectName) => {
      const queries = getModelMetricsQueries(model);
      return (
        <ModelServingMetricsProvider
          queries={queries}
          type={PerformanceMetricType.MODEL}
          namespace={projectName}
        >
          <Outlet context={{ model, projectName }} />
        </ModelServingMetricsProvider>
      );
    }}
  </ModelMetricsPathWrapper>
);

export default GlobalModelMetricsWrapper;
