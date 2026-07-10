import React from 'react';
import { EmptyDetailsView, ProjectObjectType } from '@odh-dashboard/ui-core';
import { typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { DeployButton } from '../../components/deploy/DeployButton';

type GlobalNoModelsViewProps = {
  project?: ProjectKind | undefined;
};

export const GlobalNoModelsView: React.FC<GlobalNoModelsViewProps> = ({ project }) => (
  <EmptyDetailsView
    title="No deployed models"
    description="To get started, deploy a model."
    iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
    imageAlt="deploy a model"
    createButton={<DeployButton project={project ?? null} />}
  />
);
export default GlobalNoModelsView;
