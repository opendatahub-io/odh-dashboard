import * as React from 'react';
import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import GenericSidebar from '~/components/GenericSidebar';
import { useAppContext } from '~/app/AppContext';
import ServingRuntimeList from '~/pages/modelServing/screens/projects/ServingRuntimeList';
import { featureFlagEnabled } from '~/utilities/utils';
import PipelinesSection from '~/pages/projects/screens/detail/pipelines/PipelinesSection';
import NotebooksList from './notebooks/NotebookList';
import { ProjectSectionID } from './types';
import StorageList from './storage/StorageList';
import { ProjectSectionTitles } from './const';
import DataConnectionsList from './data-connections/DataConnectionsList';

type SectionType = {
  id: ProjectSectionID;
  component: React.ReactNode;
};

const ProjectDetailsComponents: React.FC = () => {
  const { dashboardConfig } = useAppContext();
  const modelServingEnabled = featureFlagEnabled(
    dashboardConfig.spec.dashboardConfig.disableModelServing,
  );
  const pipelinesEnabled =
    featureFlagEnabled(dashboardConfig.spec.dashboardConfig.disablePipelines) &&
    dashboardConfig.status.dependencyOperators.redhatOpenshiftPipelines.available;

  const sections: SectionType[] = [
    {
      id: ProjectSectionID.WORKBENCHES,
      component: <NotebooksList />,
    },
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
            component: <ServingRuntimeList />,
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
                data-id="details-page-section"
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
