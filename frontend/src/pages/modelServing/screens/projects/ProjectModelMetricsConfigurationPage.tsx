import * as React from 'react';
import { useOutletContext } from 'react-router';
import { getInferenceServiceDisplayName } from '~/pages/modelServing/screens/global/utils';
import BiasConfigurationPage from '~/pages/modelServing/screens/metrics/bias/BiasConfigurationPage/BiasConfigurationPage';
import { getProjectDisplayName } from '~/concepts/projects/utils';
import { ProjectModelMetricsOutletContextProps } from './ProjectModelMetricsWrapper';

const ProjectModelMetricsConfigurationPage: React.FC = () => {
  const { currentProject, model } = useOutletContext<ProjectModelMetricsOutletContextProps>();
  return (
    <BiasConfigurationPage
      breadcrumbItems={[
        { label: 'Data science projects', link: '/projects' },
        {
          label: getProjectDisplayName(currentProject),
          link: `/projects/${currentProject.metadata.name}`,
        },
        {
          label: getInferenceServiceDisplayName(model),
          link: `/projects/${currentProject.metadata.name}/metrics/model/${model.metadata.name}`,
        },
        { label: 'Metric configuration', isActive: true },
      ]}
      inferenceService={model}
    />
  );
};

export default ProjectModelMetricsConfigurationPage;
