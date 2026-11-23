import * as React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useWorkingProject } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { ProjectsContext } from '#~/concepts/projects/ProjectsContext';

const useSyncPreferredProject = (
  newPreferredProject: ProjectKind | null,
  skipWhenUnifiedProjectSelectorEnabled = false,
): void => {
  const { preferredProject, updatePreferredProject } = React.useContext(ProjectsContext);
  const { registerProjectRouteSync } = useWorkingProject();
  const unifiedProjectSelectorEnabled = useIsAreaAvailable(
    SupportedArea.UNIFIED_PROJECT_SELECTOR,
  ).status;

  React.useLayoutEffect(() => {
    if (unifiedProjectSelectorEnabled && !skipWhenUnifiedProjectSelectorEnabled) {
      return registerProjectRouteSync?.();
    }
    return undefined;
  }, [
    unifiedProjectSelectorEnabled,
    skipWhenUnifiedProjectSelectorEnabled,
    registerProjectRouteSync,
  ]);

  React.useEffect(() => {
    // Project details can display a different project from the working project.
    // Other project-scoped routes still synchronize their URL with the selection.
    if (unifiedProjectSelectorEnabled && skipWhenUnifiedProjectSelectorEnabled) {
      return;
    }
    if (newPreferredProject?.metadata.name !== preferredProject?.metadata.name) {
      updatePreferredProject(newPreferredProject);
    }
  }, [
    unifiedProjectSelectorEnabled,
    skipWhenUnifiedProjectSelectorEnabled,
    newPreferredProject,
    preferredProject,
    updatePreferredProject,
  ]);
};

export default useSyncPreferredProject;
