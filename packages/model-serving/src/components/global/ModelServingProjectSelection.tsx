import * as React from 'react';
import { ProjectSelectorNavigator } from '@odh-dashboard/ui-core';

type ModelServingProjectSelectionProps = {
  getRedirectPath: (namespace: string) => string;
};

const ModelServingProjectSelection: React.FC<ModelServingProjectSelectionProps> = ({
  getRedirectPath,
}) => (
  <ProjectSelectorNavigator
    getRedirectPath={getRedirectPath}
    invalidDropdownPlaceholder="All projects"
    selectAllProjects
    showTitle
    showProjectNavigatorLink={false}
  />
);

export default ModelServingProjectSelection;
