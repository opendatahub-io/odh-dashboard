import React from 'react';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { isProjectDetailsTab } from '@odh-dashboard/plugin-core/extension-points';
import useModelServingEnabled from '#~/pages/modelServing/useModelServingEnabled';
import { SectionDefinition } from '#~/pages/projects/components/GenericHorizontalBar';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import ModelServingPlatform from '#~/pages/modelServing/screens/projects/ModelServingPlatform';

export const useDeploymentsTab = (): SectionDefinition[] => {
  const modelServingEnabled = useModelServingEnabled();

  const projectDetailsTabExtensions = useExtensions(isProjectDetailsTab);
  const deploymentsProjectDetailsTab = projectDetailsTabExtensions.find(
    (tab) => tab.properties.id === ProjectSectionID.MODEL_SERVER,
  )?.properties.component;

  const tab: SectionDefinition[] = modelServingEnabled
    ? [
        {
          id: ProjectSectionID.MODEL_SERVER,
          title: 'Deployments ccc',
          component: deploymentsProjectDetailsTab ? (
            <LazyCodeRefComponent component={deploymentsProjectDetailsTab} />
          ) : (
            <ModelServingPlatform />
          ),
        },
      ]
    : [];

  return tab;
};
