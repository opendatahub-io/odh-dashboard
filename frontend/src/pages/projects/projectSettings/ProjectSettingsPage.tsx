import React, { ReactElement } from 'react';
import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import ModelBiasSettingsCard from '#~/pages/projects/projectSettings/ModelBiasSettingsCard';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import { useProjectSettingsTabVisible } from '#~/concepts/projects/accessChecks';

const ProjectSettingsPage = (): ReactElement => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const projectSettingsTabVisible = useProjectSettingsTabVisible();

  return (
    <PageSection
      hasBodyWrapper={false}
      isFilled
      aria-label="project-settings-page-section"
      id={ProjectSectionID.SETTINGS}
    >
      <Stack hasGutter>
        {projectSettingsTabVisible && (
          <StackItem>
            <ModelBiasSettingsCard project={currentProject} />
          </StackItem>
        )}
      </Stack>
    </PageSection>
  );
};

export default ProjectSettingsPage;
