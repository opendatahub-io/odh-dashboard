import React from 'react';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { isProjectDetailsTab } from '@odh-dashboard/plugin-core/extension-points';
import useModelServingEnabled from '#~/pages/modelServing/useModelServingEnabled';
import { SectionDefinition } from '#~/pages/projects/components/GenericHorizontalBar';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import ModelServingPlatform from '#~/pages/modelServing/screens/projects/ModelServingPlatform';

export const useServeModelsCard = (): SectionDefinition[] => {
  const modelServingEnabled = useModelServingEnabled();

  const serveModelsCardExtensions = useExtensions(isProjectDetailsTab);
  const serveModelsCard = serveModelsCardExtensions.find(
    (tab) => tab.properties.id === ProjectSectionID.MODEL_SERVER,
  )?.properties.component;

  const tab: SectionDefinition[] = modelServingEnabled
    ? [
        {
          id: ProjectSectionID.MODEL_SERVER,
          title: 'Serve Models',
          component: serveModelsCard ? (
            <LazyCodeRefComponent component={serveModelsCard} />
          ) : (
            <ModelServingPlatform />
          ),
        },
      ]
    : [];

  return tab;
};
