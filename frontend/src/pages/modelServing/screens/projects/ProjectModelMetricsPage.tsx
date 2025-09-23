import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import MetricsPage from '#~/pages/modelServing/screens/metrics/MetricsPage';
import { PerformanceMetricType } from '#~/pages/modelServing/screens/types';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { ProjectModelMetricsOutletContextProps } from './ProjectModelMetricsWrapper';

const ProjectModelMetricsPage: React.FC = () => {
  const { model, currentProject } = useOutletContext<ProjectModelMetricsOutletContextProps>();
  const projectDisplayName = getDisplayNameFromK8sResource(currentProject);
  const modelDisplayName = getDisplayNameFromK8sResource(model);

  return (
    <MetricsPage
      title={`${modelDisplayName} metrics`}
      breadcrumbItems={[
        { label: 'Projects', link: '/projects' },
        {
          label: projectDisplayName,
          link: `/projects/${currentProject.metadata.name}`,
        },
        {
          label: 'Deployments',
          link: `/projects/${currentProject.metadata.name}/?section=model-server`,
        },
        {
          label: modelDisplayName,
          isActive: true,
        },
      ]}
      type={PerformanceMetricType.MODEL}
      model={model}
    />
  );
};

export default ProjectModelMetricsPage;
