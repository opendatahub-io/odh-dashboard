import * as React from 'react';
import { PageSection, Stack } from '@patternfly/react-core';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import PipelineAndVersionContextProvider from '~/concepts/pipelines/content/PipelineAndVersionContext';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import { AppContext } from '~/app/AppContext';
import TrainModelsSection from './trainModels/TrainModelsSection';
import ServeModelsSection from './serverModels/ServeModelsSection';
import ConfigurationSection from './configuration/ConfigurationSection';

const ProjectOverview: React.FC = () => {
  const { altNav } = React.useContext(AppContext);
  const modelServingEnabled = useModelServingEnabled();

  return (
    <PageSection
      hasBodyWrapper={false}
      isFilled
      aria-label="project-details-page-section"
      id={ProjectSectionID.OVERVIEW}
      className={altNav ? undefined : 'pf-v6-u-pt-0 pf-v6-u-pl-0'}
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
