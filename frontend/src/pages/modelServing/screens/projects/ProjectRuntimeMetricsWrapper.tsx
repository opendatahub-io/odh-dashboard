import * as React from 'react';
import MetricsPage from '~/pages/modelServing/screens/metrics/MetricsPage';
import { ModelServingMetricsProvider } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { getRuntimeMetricsQueries } from '~/pages/modelServing/screens/metrics/utils';
import { getProjectDisplayName } from '~/pages/projects/utils';
import { MetricType } from '~/pages/modelServing/screens/types';
import ProjectRuntimeMetricsPathWrapper from './ProjectRuntimeMetricsPathWrapper';
import { getModelServerDisplayName } from './utils';

const ProjectRuntimeMetricsWrapper: React.FC = () => (
  <ProjectRuntimeMetricsPathWrapper>
    {(servingRuntime, currentProject) => {
      const queries = getRuntimeMetricsQueries(servingRuntime);
      const projectDisplayName = getProjectDisplayName(currentProject);
      const serverName = getModelServerDisplayName(servingRuntime);
      return (
        <ModelServingMetricsProvider queries={queries} type={MetricType.RUNTIME}>
          <MetricsPage
            title={`${serverName} metrics`}
            breadcrumbItems={[
              { label: 'Data Science Projects', link: '/projects' },
              {
                label: projectDisplayName,
                link: `/projects/${currentProject.metadata.name}`,
              },
              {
                label: serverName,
                isActive: true,
              },
            ]}
            type={MetricType.RUNTIME}
          />
        </ModelServingMetricsProvider>
      );
    }}
  </ProjectRuntimeMetricsPathWrapper>
);

export default ProjectRuntimeMetricsWrapper;
