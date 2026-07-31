import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { MetricsCommonContextProvider } from '@odh-dashboard/internal/concepts/metrics/MetricsCommonContext';
import { PerformanceMetricType } from '@odh-dashboard/model-serving/shared/types';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
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
        <MetricsCommonContextProvider>
          <ModelServingMetricsProvider
            queries={queries}
            type={PerformanceMetricType.MODEL}
            namespace={projectName}
          >
            <Outlet context={{ model, projectName }} />
          </ModelServingMetricsProvider>
        </MetricsCommonContextProvider>
      );
    }}
  </ModelMetricsPathWrapper>
);

export default GlobalModelMetricsWrapper;
