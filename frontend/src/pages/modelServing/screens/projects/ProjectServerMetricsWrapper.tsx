import * as React from 'react';
import MetricsPage from '~/pages/modelServing/screens/metrics/MetricsPage';
import { ModelServingMetricsProvider } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { getServerMetricsQueries } from '~/pages/modelServing/screens/metrics/utils';
import { getProjectDisplayName } from '~/pages/projects/utils';
import { PerformanceMetricType } from '~/pages/modelServing/screens/types';
import useCurrentTimeframeBrowserStorage from '~/pages/modelServing/screens/metrics/useCurrentTimeframeBrowserStorage';
import ProjectServerMetricsPathWrapper from './ProjectServerMetricsPathWrapper';
import { getModelServerDisplayName } from './utils';

const ProjectServerMetricsWrapper: React.FC = () => {
  const [currentTimeframe] = useCurrentTimeframeBrowserStorage();
  return (
    <ProjectServerMetricsPathWrapper>
      {(servingRuntime, currentProject) => {
        const queries = getServerMetricsQueries(servingRuntime, currentTimeframe);
        const projectDisplayName = getProjectDisplayName(currentProject);
        const serverName = getModelServerDisplayName(servingRuntime);
        return (
          <ModelServingMetricsProvider
            queries={queries}
            type={PerformanceMetricType.SERVER}
            namespace={projectDisplayName}
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
        );
      }}
    </ProjectServerMetricsPathWrapper>
  );
};

export default ProjectServerMetricsWrapper;
