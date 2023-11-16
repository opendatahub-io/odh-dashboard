import React from 'react';
import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import ModelBiasSettingsCard from '~/pages/projects/projectSettings/ModelBiasSettingsCard';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import useBiasMetricsEnabled from '~/concepts/explainability/useBiasMetricsEnabled';

const ProjectSettingsPage = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;
  const biasMetricsEnabled = useBiasMetricsEnabled();

  return (
    <PageSection isFilled aria-label="project-settings-page-section" variant="light">
      <Stack hasGutter>
        {biasMetricsEnabled && (
          <StackItem>
            <ModelBiasSettingsCard namespace={namespace} />
          </StackItem>
        )}
      </Stack>
    </PageSection>
  );
};

export default ProjectSettingsPage;
