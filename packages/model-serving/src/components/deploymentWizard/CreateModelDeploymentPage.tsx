import React from 'react';
import { ProjectsContext, byName } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { useParams } from 'react-router-dom';
import ModelDeploymentWizard from './ModelDeploymentWizard';

const CreateModelDeploymentPage: React.FC = () => {
  const { namespace } = useParams();

  const { projects } = React.useContext(ProjectsContext);
  const currentProject = projects.find(byName(namespace)) ?? undefined;

  return (
    <ModelDeploymentWizard
      title="Deploy a model"
      description="Configure and deploy your model."
      primaryButtonText="Deploy model"
      project={currentProject}
    />
  );
};

export default CreateModelDeploymentPage;
