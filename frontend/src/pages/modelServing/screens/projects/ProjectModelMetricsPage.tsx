import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import MetricsPage from '#~/pages/modelServing/screens/metrics/MetricsPage';
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
      model={model}
    />
  );
};

export default ProjectModelMetricsPage;
