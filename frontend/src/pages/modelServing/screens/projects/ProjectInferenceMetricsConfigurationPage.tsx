import * as React from 'react';
import { useOutletContext } from 'react-router';
import { getInferenceServiceDisplayName } from '~/pages/modelServing/screens/global/utils';
import BiasConfigurationPage from '~/pages/modelServing/screens/metrics/BiasConfigurationPage';
import { getProjectDisplayName } from '~/pages/projects/utils';
import { ProjectInferenceMetricsOutletContextProps } from './ProjectInferenceMetricsWrapper';

const ProjectInferenceMetricsConfigurationPage: React.FC = () => {
  const { currentProject, inferenceService } =
    useOutletContext<ProjectInferenceMetricsOutletContextProps>();
  const modelDisplayName = getInferenceServiceDisplayName(inferenceService);
  return (
    <BiasConfigurationPage
      breadcrumbItems={[
        { label: 'Data Science Projects', link: '/projects' },
        {
          label: getProjectDisplayName(currentProject),
          link: `/projects/${currentProject.metadata.name}`,
        },
        {
          label: modelDisplayName,
          link: `/projects/${currentProject.metadata.name}/metrics/model/${inferenceService.metadata.name}`,
        },
        { label: 'Metric configuration', isActive: true },
      ]}
      modelDisplayName={modelDisplayName}
    />
  );
};

export default ProjectInferenceMetricsConfigurationPage;
