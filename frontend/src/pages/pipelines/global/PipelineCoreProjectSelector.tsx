import * as React from 'react';
import ProjectSelectorNavigator from '#~/concepts/projects/ProjectSelectorNavigator';

type PipelineCoreProjectSelectorProps = {
  getRedirectPath: (namespace: string) => string;
  queryParamNamespace?: string;
};

const PipelineCoreProjectSelector: React.FC<PipelineCoreProjectSelectorProps> = ({
  getRedirectPath,
  queryParamNamespace,
}) => (
  <ProjectSelectorNavigator
    getRedirectPath={getRedirectPath}
    queryParamNamespace={queryParamNamespace}
    showTitle
  />
);

export default PipelineCoreProjectSelector;
