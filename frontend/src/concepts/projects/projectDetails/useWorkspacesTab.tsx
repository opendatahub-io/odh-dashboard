import React from 'react';
import { Label } from '@patternfly/react-core';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { isProjectDetailsTab } from '@odh-dashboard/plugin-core/extension-points';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { SectionDefinition } from '#~/pages/projects/components/GenericHorizontalBar';
import {
  LEGACY_WORKBENCHES_V2_SECTION,
  ProjectSectionID,
} from '#~/pages/projects/screens/detail/types';

export const useWorkspacesTab = (): SectionDefinition[] => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const projectDetailsTabExtensions = useExtensions(isProjectDetailsTab);
  const workspacesExtension = projectDetailsTabExtensions.find(
    (tab) =>
      tab.properties.id === ProjectSectionID.WORKSPACES ||
      tab.properties.id === LEGACY_WORKBENCHES_V2_SECTION,
  )?.properties.component;

  if (!workspacesExtension) {
    return [];
  }

  return [
    {
      id: ProjectSectionID.WORKSPACES,
      title: 'Workspaces',
      label: (
        <Label color="orange" variant="outline">
          Dev Preview
        </Label>
      ),
      component: (
        <LazyCodeRefComponent
          component={workspacesExtension}
          props={{ namespace: currentProject.metadata.name }}
        />
      ),
    },
  ];
};
