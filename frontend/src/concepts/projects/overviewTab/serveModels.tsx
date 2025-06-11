import React from 'react';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { isProjectDetailsTab } from '@odh-dashboard/plugin-core/extension-points';
import useModelServingEnabled from '#~/pages/modelServing/useModelServingEnabled';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import ServeModelsSection from '#~/pages/projects/screens/detail/overview/serverModels/ServeModelsSection.tsx';

const ServeModelsCard: React.FC = () => {
  const modelServingEnabled = useModelServingEnabled();

  const serveModelsCardExtensions = useExtensions(isProjectDetailsTab);
  const serveModelsCard = serveModelsCardExtensions.find(
    (tab) => tab.properties.id === ProjectSectionID.MODEL_SERVER,
  )?.properties.component;

  if (!modelServingEnabled) {
    return null;
  }

  return serveModelsCard ? (
    <LazyCodeRefComponent component={serveModelsCard} />
  ) : (
    <ServeModelsSection />
  );
};

export default ServeModelsCard;
