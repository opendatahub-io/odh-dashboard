import * as React from 'react';
import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import GenericSidebar from '~/components/GenericSidebar';
import { useAppContext } from '~/app/AppContext';
import ModelServingPlatform from '~/pages/modelServing/screens/projects/ModelServingPlatform';
import PipelinesSection from '~/pages/projects/screens/detail/pipelines/PipelinesSection';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import NotebooksList from './notebooks/NotebookList';
import { ProjectSectionID } from './types';
import StorageList from './storage/StorageList';
import { ProjectSectionTitles } from './const';
import DataConnectionsList from './data-connections/DataConnectionsList';

import './ProjectDetailsComponents.scss';

type SectionType = {
  id: ProjectSectionID;
  component: React.ReactNode;
};

const ProjectDetailsComponents: React.FC = () => {
  const { dashboardConfig } = useAppContext();
  const workbenchesEnabled = useIsAreaAvailable(SupportedArea.WORKBENCHES).status;
  const modelServingEnabled = useModelServingEnabled();
  const pipelinesEnabled =
    useIsAreaAvailable(SupportedArea.DS_PIPELINES).status &&
    dashboardConfig.status.dependencyOperators.redhatOpenshiftPipelines.available;

  const sections: SectionType[] = [
    ...(workbenchesEnabled
      ? [
          {
            id: ProjectSectionID.WORKBENCHES,
            component: <NotebooksList />,
          },
        ]
      : []),
    {
      id: ProjectSectionID.CLUSTER_STORAGES,
      component: <StorageList />,
    },
    {
      id: ProjectSectionID.DATA_CONNECTIONS,
      component: <DataConnectionsList />,
    },
    ...(pipelinesEnabled
      ? [
          {
            id: ProjectSectionID.PIPELINES,
            component: <PipelinesSection />,
          },
        ]
      : []),
    ...(modelServingEnabled
      ? [
          {
            id: ProjectSectionID.MODEL_SERVER,
            component: <ModelServingPlatform />,
          },
        ]
      : []),
  ];

  return (
    <PageSection isFilled aria-label="project-details-page-section" variant="light">
      <GenericSidebar
        sections={sections.map(({ id }) => id)}
        titles={ProjectSectionTitles}
        maxWidth={175}
      >
        <Stack hasGutter>
          {sections.map(({ id, component }) => (
            <React.Fragment key={id}>
              <StackItem
                id={id}
                aria-label={ProjectSectionTitles[id]}
                data-testid="details-page-section"
                className="odh-project-details-components__item"
              >
                {component}
              </StackItem>
            </React.Fragment>
          ))}
        </Stack>
      </GenericSidebar>
    </PageSection>
  );
};

export default ProjectDetailsComponents;
