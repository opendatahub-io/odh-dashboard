import * as React from 'react';
import { useOutletContext } from 'react-router';
import BiasConfigurationPage from '#~/pages/modelServing/screens/metrics/bias/BiasConfigurationPage/BiasConfigurationPage';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { ProjectModelMetricsOutletContextProps } from './ProjectModelMetricsWrapper';

const ProjectModelMetricsConfigurationPage: React.FC = () => {
  const { currentProject, model } = useOutletContext<ProjectModelMetricsOutletContextProps>();
  return (
    <BiasConfigurationPage
      breadcrumbItems={[
        { label: 'Data science projects', link: '/projects' },
        {
          label: getDisplayNameFromK8sResource(currentProject),
          link: `/projects/${currentProject.metadata.name}`,
        },
        {
          label: getDisplayNameFromK8sResource(model),
          link: `/projects/${currentProject.metadata.name}/metrics/model/${model.metadata.name}`,
        },
        { label: 'Metric configuration', isActive: true },
      ]}
      inferenceService={model}
    />
  );
};

export default ProjectModelMetricsConfigurationPage;
