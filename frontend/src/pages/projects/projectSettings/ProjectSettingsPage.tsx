import React, { ReactElement } from 'react';
import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { isProjectDetailsSettingsCard } from '@odh-dashboard/plugin-core/extension-points';
import ModelBiasSettingsCard from '#~/pages/projects/projectSettings/ModelBiasSettingsCard';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import { useProjectSettingsTabVisible } from '#~/concepts/projects/accessChecks';

const ProjectSettingsPage = (): ReactElement => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const projectSettingsTabVisible = useProjectSettingsTabVisible();
  const settingsCardExtensions = useExtensions(isProjectDetailsSettingsCard);

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
        {settingsCardExtensions.map((ext) => (
          <StackItem key={ext.properties.id}>
            <LazyCodeRefComponent component={ext.properties.component} />
          </StackItem>
        ))}
      </Stack>
    </PageSection>
  );
};

export default ProjectSettingsPage;
