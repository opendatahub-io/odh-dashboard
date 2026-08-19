import React from 'react';
import ProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelector';
import type { ProjectSelectorFieldProps } from '../../frontend/src/odh/extension-points';

/**
 * Host-side project selector for the mlflow remote. Runs in the host React tree
 * so it consumes the real ProjectsContextProvider (not a second MF instance).
 */
const ProjectSelectorField: React.FC<ProjectSelectorFieldProps> = (props) => (
  <ProjectSelector {...props} />
);

export default ProjectSelectorField;
