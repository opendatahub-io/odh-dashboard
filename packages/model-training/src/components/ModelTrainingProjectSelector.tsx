import * as React from 'react';
import ProjectSelectorNavigator from '@odh-dashboard/internal/concepts/projects/ProjectSelectorNavigator';

type ModelTrainingProjectSelectorProps = {
  getRedirectPath: (namespace: string) => string;
};

const ModelTrainingProjectSelector: React.FC<ModelTrainingProjectSelectorProps> = ({
  getRedirectPath,
}) => (
  <ProjectSelectorNavigator
    getRedirectPath={getRedirectPath}
    invalidDropdownPlaceholder="All projects"
    selectAllProjects
    showTitle
  />
);

export default ModelTrainingProjectSelector;
