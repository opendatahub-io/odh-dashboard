import * as React from 'react';
import ProjectSelectorNavigator from '~/concepts/projects/ProjectSelectorNavigator';

type PipelineCoreProjectSelectorProps = {
  page: string;
  getRedirectPath: (namespace: string) => string;
};

const PipelineCoreProjectSelector: React.FC<PipelineCoreProjectSelectorProps> = ({
  page,
  getRedirectPath,
}) => <ProjectSelectorNavigator page={page} getRedirectPath={getRedirectPath} showTitle />;

export default PipelineCoreProjectSelector;
