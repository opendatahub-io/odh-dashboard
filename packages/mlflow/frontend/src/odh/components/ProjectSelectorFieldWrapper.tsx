import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import ProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelector';
import { isProjectSelectorExtension, type ProjectSelectorFieldProps } from '~/odh/extension-points';

/**
 * Resolves the host `mlflow.project/selector` extension so the selector runs in
 * the host graph (same ProjectsContext as the rest of the dashboard). Falls back
 * to ui-core ProjectSelector when no host extension is registered (standalone).
 */
const ProjectSelectorFieldWrapper: React.FC<ProjectSelectorFieldProps> = (props) => {
  const [extensions, loaded] = useResolvedExtensions(isProjectSelectorExtension);

  if (!loaded) {
    return <ProjectSelector {...props} isLoading />;
  }

  if (extensions.length > 0) {
    const CustomField = extensions[0].properties.component.default;
    return <CustomField {...props} />;
  }

  return <ProjectSelector {...props} />;
};

export default ProjectSelectorFieldWrapper;
