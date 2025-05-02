import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { isProjectDetailsTab } from '@odh-dashboard/plugin-core/extension-points';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import { SectionDefinition } from '~/pages/projects/components/GenericHorizontalBar';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import ModelServingPlatform from '~/pages/modelServing/screens/projects/ModelServingPlatform';

export const useModelServingTab = (): SectionDefinition[] => {
  const modelServingEnabled = useModelServingEnabled();

  const [projectDetailsTabExtensions] = useResolvedExtensions(isProjectDetailsTab);
  const ModelsProjectDetailsTab = projectDetailsTabExtensions.find(
    (tab) => tab.properties.id === ProjectSectionID.MODEL_SERVER,
  )?.properties.component.default;

  const tab: SectionDefinition[] = modelServingEnabled
    ? [
        {
          id: ProjectSectionID.MODEL_SERVER,
          title: 'Models',
          component: ModelsProjectDetailsTab ? (
            <ModelsProjectDetailsTab />
          ) : (
            <ModelServingPlatform />
          ),
        },
      ]
    : [];

  return tab;
};
