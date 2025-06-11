import * as React from 'react';
import MetricsPage from '#~/pages/modelServing/screens/metrics/MetricsPage';
import { MetricsCommonContextProvider } from '#~/concepts/metrics/MetricsCommonContext';
import { ModelServingMetricsProvider } from '#~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { getServerMetricsQueries } from '#~/pages/modelServing/screens/metrics/utils';
import { PerformanceMetricType } from '#~/pages/modelServing/screens/types';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import ProjectServerMetricsPathWrapper from './ProjectServerMetricsPathWrapper';

const ProjectServerMetricsWrapper: React.FC = () => (
  <ProjectServerMetricsPathWrapper>
    {(servingRuntime, currentProject) => {
      const queries = getServerMetricsQueries(servingRuntime);
      const projectDisplayName = getDisplayNameFromK8sResource(currentProject);
      const serverName = getDisplayNameFromK8sResource(servingRuntime);
      return (
        <MetricsCommonContextProvider>
          <ModelServingMetricsProvider
            queries={queries}
            type={PerformanceMetricType.SERVER}
            namespace={currentProject.metadata.name}
          >
            <MetricsPage
              title={`${serverName} metrics`}
              breadcrumbItems={[
                { label: 'Data science projects', link: '/projects' },
                {
                  label: projectDisplayName,
                  link: `/projects/${currentProject.metadata.name}`,
                },
                {
                  label: serverName,
                  isActive: true,
                },
              ]}
              type={PerformanceMetricType.SERVER}
            />
          </ModelServingMetricsProvider>
        </MetricsCommonContextProvider>
      );
    }}
  </ProjectServerMetricsPathWrapper>
);

export default ProjectServerMetricsWrapper;
