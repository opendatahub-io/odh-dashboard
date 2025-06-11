import * as React from 'react';
import { PageSection, Stack } from '@patternfly/react-core';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { isOverviewSectionExtension } from '@odh-dashboard/plugin-core/extension-points';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import PipelineAndVersionContextProvider from '#~/concepts/pipelines/content/PipelineAndVersionContext';
import useModelServingEnabled from '#~/pages/modelServing/useModelServingEnabled';
import TrainModelsSection from './trainModels/TrainModelsSection';
import ConfigurationSection from './configuration/ConfigurationSection';
import ServeModelsSection from './serverModels/ServeModelsSection';

const ProjectOverview: React.FC = () => {
  const modelServingEnabled = useModelServingEnabled();
  const overviewSectionExtensions = useExtensions(isOverviewSectionExtension);
  const serveModelsCard = overviewSectionExtensions.find(
    (section) => section.properties.id === 'serve-model',
  )?.properties.component;

  return (
    <PageSection
      hasBodyWrapper={false}
      isFilled
      aria-label="project-details-page-section"
      id={ProjectSectionID.OVERVIEW}
    >
      <Stack hasGutter data-testid={`section-${ProjectSectionID.OVERVIEW}`}>
        <PipelineAndVersionContextProvider>
          <TrainModelsSection />
        </PipelineAndVersionContextProvider>
        {modelServingEnabled && serveModelsCard ? (
          <LazyCodeRefComponent component={serveModelsCard} />
        ) : (
          <ServeModelsSection />
        )}
        <ConfigurationSection />
      </Stack>
    </PageSection>
  );
};

export default ProjectOverview;
