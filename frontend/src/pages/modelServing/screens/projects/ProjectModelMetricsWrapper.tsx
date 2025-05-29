import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { MetricsCommonContextProvider } from '#~/concepts/metrics/MetricsCommonContext';
import { ModelServingMetricsProvider } from '#~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { getModelMetricsQueries } from '#~/pages/modelServing/screens/metrics/utils';
import { PerformanceMetricType } from '#~/pages/modelServing/screens/types';
import { InferenceServiceKind, ProjectKind } from '#~/k8sTypes';
import ProjectModelMetricsPathWrapper from './ProjectModelMetricsPathWrapper';

export type ProjectModelMetricsOutletContextProps = {
  model: InferenceServiceKind;
  currentProject: ProjectKind;
};

const ProjectModelMetricsWrapper: React.FC = () => (
  <ProjectModelMetricsPathWrapper>
    {(model, currentProject) => {
      const queries = getModelMetricsQueries(model);
      return (
        <MetricsCommonContextProvider>
          <ModelServingMetricsProvider
            queries={queries}
            type={PerformanceMetricType.MODEL}
            namespace={currentProject.metadata.name}
          >
            <Outlet context={{ model, currentProject }} />
          </ModelServingMetricsProvider>
        </MetricsCommonContextProvider>
      );
    }}
  </ProjectModelMetricsPathWrapper>
);

export default ProjectModelMetricsWrapper;
