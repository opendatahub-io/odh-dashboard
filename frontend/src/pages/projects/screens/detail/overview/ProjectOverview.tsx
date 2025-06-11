import * as React from 'react';
import { PageSection, Stack } from '@patternfly/react-core';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import PipelineAndVersionContextProvider from '#~/concepts/pipelines/content/PipelineAndVersionContext';
import useModelServingEnabled from '#~/pages/modelServing/useModelServingEnabled';
import TrainModelsSection from './trainModels/TrainModelsSection';
import ServeModelsSection from './serverModels/ServeModelsSection';
import ConfigurationSection from './configuration/ConfigurationSection';

const ProjectOverview: React.FC = () => {
  const modelServingEnabled = useModelServingEnabled();

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
        {modelServingEnabled ? <ServeModelsSection /> : undefined}
        <ConfigurationSection />
      </Stack>
    </PageSection>
  );
};

export default ProjectOverview;
