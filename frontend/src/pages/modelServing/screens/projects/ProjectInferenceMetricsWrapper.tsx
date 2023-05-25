import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { ModelServingMetricsProvider } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { getInferenceServiceMetricsQueries } from '~/pages/modelServing/screens/metrics/utils';
import { MetricType } from '~/pages/modelServing/screens/types';
import { InferenceServiceKind, ProjectKind } from '~/k8sTypes';
import ProjectInferenceMetricsPathWrapper from './ProjectInferenceMetricsPathWrapper';

export type ProjectInferenceMetricsOutletContextProps = {
  inferenceService: InferenceServiceKind;
  currentProject: ProjectKind;
};

const ProjectInferenceMetricsWrapper: React.FC = () => (
  <ProjectInferenceMetricsPathWrapper>
    {(inferenceService, currentProject) => {
      const queries = getInferenceServiceMetricsQueries(inferenceService);
      return (
        <ModelServingMetricsProvider queries={queries} type={MetricType.INFERENCE}>
          <Outlet context={{ inferenceService, currentProject }} />
        </ModelServingMetricsProvider>
      );
    }}
  </ProjectInferenceMetricsPathWrapper>
);

export default ProjectInferenceMetricsWrapper;
