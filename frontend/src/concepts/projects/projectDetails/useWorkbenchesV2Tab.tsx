import React from 'react';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { isProjectDetailsTab } from '@odh-dashboard/plugin-core/extension-points';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { SectionDefinition } from '#~/pages/projects/components/GenericHorizontalBar';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';

export const useWorkbenchesV2Tab = (): SectionDefinition[] => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const projectDetailsTabExtensions = useExtensions(isProjectDetailsTab);
  const workbenchesV2Extension = projectDetailsTabExtensions.find(
    (tab) => tab.properties.id === ProjectSectionID.WORKBENCHES_V2,
  )?.properties.component;

  if (!workbenchesV2Extension) {
    return [];
  }

  return [
    {
      id: ProjectSectionID.WORKBENCHES_V2,
      title: 'Workbenches v2',
      component: (
        <LazyCodeRefComponent
          component={workbenchesV2Extension}
          props={{ namespace: currentProject.metadata.name }}
        />
      ),
    },
  ];
};
