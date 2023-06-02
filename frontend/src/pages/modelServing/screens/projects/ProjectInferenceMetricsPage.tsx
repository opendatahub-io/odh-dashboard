import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import { getInferenceServiceDisplayName } from '~/pages/modelServing/screens/global/utils';
import MetricsPage from '~/pages/modelServing/screens/metrics/MetricsPage';
import { getProjectDisplayName } from '~/pages/projects/utils';
import { ProjectInferenceMetricsOutletContextProps } from './ProjectInferenceMetricsWrapper';

const ProjectInferenceMetricsPage: React.FC = () => {
  const { inferenceService, currentProject } =
    useOutletContext<ProjectInferenceMetricsOutletContextProps>();
  const projectDisplayName = getProjectDisplayName(currentProject);
  const modelDisplayName = getInferenceServiceDisplayName(inferenceService);

  return (
    <MetricsPage
      title={`${modelDisplayName} metrics`}
      breadcrumbItems={[
        { label: 'Data Science Projects', link: '/projects' },
        {
          label: projectDisplayName,
          link: `/projects/${currentProject.metadata.name}`,
        },
        {
          label: modelDisplayName,
          isActive: true,
        },
      ]}
    />
  );
};

export default ProjectInferenceMetricsPage;
