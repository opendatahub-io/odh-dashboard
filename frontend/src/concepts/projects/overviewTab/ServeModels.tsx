import React from 'react';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { isOverviewSectionExtension } from '@odh-dashboard/plugin-core/extension-points';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import ServeModelsSection from '#~/pages/projects/screens/detail/overview/serverModels/ServeModelsSection.tsx';

const OverviewModelsSection: React.FC = () => {
  const serveModelsCardExtensions = useExtensions(isOverviewSectionExtension);
  const serveModelsCard = serveModelsCardExtensions.find(
    (tab) => tab.properties.id === ProjectSectionID.MODEL_SERVER,
  )?.properties.component;

  return serveModelsCard ? (
    <LazyCodeRefComponent component={serveModelsCard} />
  ) : (
    <ServeModelsSection />
  );
};

export default OverviewModelsSection;
