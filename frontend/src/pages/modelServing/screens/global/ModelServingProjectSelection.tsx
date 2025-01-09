import * as React from 'react';
import ProjectSelectorNavigator from '~/concepts/projects/ProjectSelectorNavigator';

type ModelServingProjectSelectionProps = {
  getRedirectPath: (namespace: string) => string;
};

const ModelServingProjectSelection: React.FC<ModelServingProjectSelectionProps> = ({
  getRedirectPath,
}) => (
  <ProjectSelectorNavigator
    page="model-serving"
    getRedirectPath={getRedirectPath}
    invalidDropdownPlaceholder="All projects"
    selectAllProjects
    showTitle
  />
);

export default ModelServingProjectSelection;
