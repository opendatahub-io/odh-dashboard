import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useExtensions } from '@openshift/dynamic-plugin-sdk';
import { byName, ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import ModelDeploymentWizard from './ModelDeploymentWizard';
import { UseModelDeploymentWizardProps } from './useDeploymentWizard';
import { Deployment, isModelServingPlatformExtension } from '../../../extension-points';
import {
  ModelDeploymentsContext,
  ModelDeploymentsProvider,
} from '../../concepts/ModelDeploymentsContext';
import { useProjectServingPlatform } from '../../concepts/useProjectServingPlatform';

const EditModelDeploymentPage: React.FC = () => {
  const { namespace } = useParams();

  const { projects, loaded, loadError } = React.useContext(ProjectsContext);
  const currentProject = projects.find(byName(namespace)) ?? undefined;

  const platformExtensions = useExtensions(isModelServingPlatformExtension);
  const { activePlatform } = useProjectServingPlatform(currentProject, platformExtensions);

  return (
    <ModelDeploymentsProvider
      modelServingPlatforms={activePlatform ? [activePlatform] : []}
      projects={currentProject ? [currentProject] : []}
    >
      <EditModelDeploymentContent />
    </ModelDeploymentsProvider>
  );
};

export default EditModelDeploymentPage;

const EditModelDeploymentContent: React.FC = () => {
  const location = useLocation();
  const { deployments } = React.useContext(ModelDeploymentsContext);

  const existingDeployment = React.useMemo(() => {
    const deploymentName = location.pathname.split('/').at(-1);

    return deployments?.find((d: Deployment) => d.model.metadata.name === deploymentName);
  }, [deployments, location]);

  const extractFormDataFromDeployment: (deployment: Deployment) => UseModelDeploymentWizardProps = (
    deployment: Deployment,
  ) => ({
    deploymentName: {
      name: deployment.model.metadata.annotations?.['openshift.io/display-name'] ?? '',
      k8sName: deployment.model.metadata.name,
    },
  });

  const formData = React.useMemo(() => {
    if (existingDeployment) {
      return extractFormDataFromDeployment(existingDeployment);
    }
    return undefined;
  }, [existingDeployment, extractFormDataFromDeployment]);

  return (
    <ModelDeploymentWizard
      title="Edit model deployment"
      description="Update your model deployment configuration."
      primaryButtonText="Update deployment"
      existingData={formData}
    />
  );
};
