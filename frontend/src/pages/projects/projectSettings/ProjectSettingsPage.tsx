import React from 'react';
import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import ModelBiasSettingsCard from '~/pages/projects/projectSettings/ModelBiasSettingsCard';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

const ProjectSettingsPage = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;

  return (
    <PageSection isFilled aria-label="project-settings-page-section" variant="light">
      <Stack hasGutter>
        {biasMetricsAreaAvailable && (
          <StackItem>
            <ModelBiasSettingsCard project={currentProject} />
          </StackItem>
        )}
      </Stack>
    </PageSection>
  );
};

export default ProjectSettingsPage;
