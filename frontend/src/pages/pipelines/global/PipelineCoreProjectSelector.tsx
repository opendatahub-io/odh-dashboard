import * as React from 'react';
import ProjectSelectorNavigator from '#~/concepts/projects/ProjectSelectorNavigator';

type PipelineCoreProjectSelectorProps = {
  getRedirectPath: (namespace: string) => string;
};

const PipelineCoreProjectSelector: React.FC<PipelineCoreProjectSelectorProps> = ({
  getRedirectPath,
}) => <ProjectSelectorNavigator getRedirectPath={getRedirectPath} showTitle />;

export default PipelineCoreProjectSelector;
