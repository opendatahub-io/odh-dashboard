import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import { getInferenceServiceDisplayName } from '~/pages/modelServing/screens/global/utils';
import MetricsPage from '~/pages/modelServing/screens/metrics/MetricsPage';
import { getProjectDisplayName } from '~/concepts/projects/utils';
import { PerformanceMetricType } from '~/pages/modelServing/screens/types';
import { ProjectModelMetricsOutletContextProps } from './ProjectModelMetricsWrapper';

const ProjectModelMetricsPage: React.FC = () => {
  const { model, currentProject } = useOutletContext<ProjectModelMetricsOutletContextProps>();
  const projectDisplayName = getProjectDisplayName(currentProject);
  const modelDisplayName = getInferenceServiceDisplayName(model);

  return (
    <MetricsPage
      title={`${modelDisplayName} metrics`}
      breadcrumbItems={[
        { label: 'Data science projects', link: '/projects' },
        {
          label: projectDisplayName,
          link: `/projects/${currentProject.metadata.name}`,
        },
        {
          label: modelDisplayName,
          isActive: true,
        },
      ]}
      type={PerformanceMetricType.MODEL}
    />
  );
};

export default ProjectModelMetricsPage;
