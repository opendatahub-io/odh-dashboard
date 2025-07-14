import * as React from 'react';
import ProjectSelectorNavigator from '#~/concepts/projects/ProjectSelectorNavigator';

type LMEvalProjectSelectorProps = {
  getRedirectPath: (namespace: string) => string;
};

const LMEvalProjectSelector: React.FC<LMEvalProjectSelectorProps> = ({ getRedirectPath }) => (
  <ProjectSelectorNavigator
    getRedirectPath={getRedirectPath}
    invalidDropdownPlaceholder="All projects"
    selectAllProjects
    showTitle
  />
);

export default LMEvalProjectSelector;
