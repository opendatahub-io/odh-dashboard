import * as React from 'react';
import MetricsPage from '~/pages/modelServing/screens/metrics/MetricsPage';
import { MetricsCommonContextProvider } from '~/concepts/metrics/MetricsCommonContext';
import { ModelServingMetricsProvider } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { getServerMetricsQueries } from '~/pages/modelServing/screens/metrics/utils';
import { getProjectDisplayName } from '~/concepts/projects/utils';
import { PerformanceMetricType } from '~/pages/modelServing/screens/types';
import ProjectServerMetricsPathWrapper from './ProjectServerMetricsPathWrapper';
import { getModelServerDisplayName } from './utils';

const ProjectServerMetricsWrapper: React.FC = () => (
  <ProjectServerMetricsPathWrapper>
    {(servingRuntime, currentProject) => {
      const queries = getServerMetricsQueries(servingRuntime);
      const projectDisplayName = getProjectDisplayName(currentProject);
      const serverName = getModelServerDisplayName(servingRuntime);
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
