import React from 'react';
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { DeployButton } from '../../components/deploy/DeployButton';
import { getDeploymentWizardRoute } from '../deploymentWizard/utils';

type GlobalNoModelsViewProps = {
  project?: ProjectKind | undefined;
};

export const GlobalNoModelsView: React.FC<GlobalNoModelsViewProps> = ({ project }) => (
  <EmptyDetailsView
    title="No deployed models"
    description="To get started, deploy a model."
    iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
    imageAlt="deploy a model"
    createButton={
      <DeployButton
        project={project ?? null}
        createRoute={
          project?.metadata.name
            ? getDeploymentWizardRoute(`/ai-hub/deployments/${project.metadata.name}`)
            : undefined
        }
      />
    }
  />
);
export default GlobalNoModelsView;
