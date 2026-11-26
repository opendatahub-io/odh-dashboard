import React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { EmptyDetailsView, ProjectObjectType, typedEmptyImage } from '@odh-dashboard/ui-core';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import FindProjectByName from './FindProjectByName';
import { DeployButton } from '../../components/deploy/DeployButton';

type GlobalNoModelsViewProps = {
  project?: ProjectKind | undefined;
};

export const GlobalNoModelsView: React.FC<GlobalNoModelsViewProps> = ({ project }) => {
  const navigate = useNavigate();
  // Set where the host could not list the caller's projects. Without a project
  // in view, a caller who can only deploy may still open one by name.
  const { findProject } = React.useContext(ProjectsContext);
  const deployButton = <DeployButton project={project ?? null} />;
  return (
    <EmptyDetailsView
      title="No deployed models"
      description="To get started, deploy a model."
      iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
      imageAlt="deploy a model"
      createButton={
        findProject && !project ? (
          <Stack hasGutter>
            <StackItem>{deployButton}</StackItem>
            <StackItem>
              <FindProjectByName
                findProject={findProject}
                onFound={(projectName) => navigate(`/ai-hub/models/deployments/${projectName}`)}
              />
            </StackItem>
          </Stack>
        ) : (
          deployButton
        )
      }
    />
  );
};
export default GlobalNoModelsView;
