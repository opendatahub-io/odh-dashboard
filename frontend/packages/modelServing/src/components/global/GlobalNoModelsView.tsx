import React from 'react';
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import { useNavigate } from 'react-router-dom';
import { ProjectSectionID } from '@odh-dashboard/internal/pages/projects/screens/detail/types';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { Button, Truncate } from '@patternfly/react-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { DeployButton } from '../../components/deploy/DeployButton';

type GlobalNoModelsViewProps = {
  project?: ProjectKind | undefined;
};

export const GlobalNoModelsView: React.FC<GlobalNoModelsViewProps> = ({ project }) => {
  const navigate = useNavigate();
  if (project) {
    return (
      <EmptyDetailsView
        allowCreate
        iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
        imageAlt="deploy a model"
        title="No Deployed Models"
        description="To get started, deploy a model from the Models section of a project."
        createButton={
          <Button
            data-testid="empty-state-action-button"
            variant="link"
            onClick={() =>
              navigate(
                `/projects/${project.metadata.name}?section=${ProjectSectionID.MODEL_SERVER}`,
              )
            }
          >
            <Truncate content={`Go to ${getDisplayNameFromK8sResource(project)}`} />
          </Button>
        }
      />
    );
  }
  return (
    <EmptyDetailsView
      title="No Deployed Models"
      description="To get started, deploy a model from the Models section of a project."
      iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
      imageAlt="deploy a model"
      createButton={<DeployButton isDisabled platform={undefined} />}
    />
  );
};
export default GlobalNoModelsView;
