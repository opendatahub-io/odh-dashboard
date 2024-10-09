import React, { ReactElement } from 'react';
import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import ModelBiasSettingsCard from '~/pages/projects/projectSettings/ModelBiasSettingsCard';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';

const ProjectSettingsPage = (): ReactElement => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;

  return (
    <PageSection
      hasBodyWrapper={false}
      isFilled
      aria-label="project-settings-page-section"
      id={ProjectSectionID.SETTINGS}
    >
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
