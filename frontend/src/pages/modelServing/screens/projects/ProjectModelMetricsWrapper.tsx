import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { ModelServingMetricsProvider } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { getModelMetricsQueries } from '~/pages/modelServing/screens/metrics/utils';
import { PerformanceMetricType } from '~/pages/modelServing/screens/types';
import { InferenceServiceKind, ProjectKind } from '~/k8sTypes';
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
        <ModelServingMetricsProvider queries={queries} type={PerformanceMetricType.MODEL}>
          <Outlet context={{ model, currentProject }} />
        </ModelServingMetricsProvider>
      );
    }}
  </ProjectModelMetricsPathWrapper>
);

export default ProjectModelMetricsWrapper;
