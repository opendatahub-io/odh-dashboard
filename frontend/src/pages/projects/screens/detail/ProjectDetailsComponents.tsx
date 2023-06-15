import * as React from 'react';
import { Divider, PageSection, Stack, StackItem } from '@patternfly/react-core';
import GenericSidebar from '~/components/GenericSidebar';
import { useAppContext } from '~/app/AppContext';
import ServingRuntimeList from '~/pages/modelServing/screens/projects/ServingRuntimeList';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { featureFlagEnabled } from '~/utilities/utils';
import PipelinesSection from '~/pages/projects/screens/detail/pipelines/PipelinesSection';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import NotebooksList from './notebooks/NotebookList';
import { ProjectSectionID } from './types';
import StorageList from './storage/StorageList';
import { ProjectSectionTitles } from './const';
import DataConnectionsList from './data-connections/DataConnectionsList';
import useCheckLogoutParams from './useCheckLogoutParams';

type SectionType = {
  id: ProjectSectionID;
  component: React.ReactNode;
  isEmpty: boolean;
};

const ProjectDetailsComponents: React.FC = () => {
  const { dashboardConfig } = useAppContext();
  const {
    notebooks: { data: notebookStates, loaded: notebookStatesLoaded },
    pvcs: { data: pvcs, loaded: pvcsLoaded },
    dataConnections: { data: connections, loaded: connectionsLoaded },
    servingRuntimes: { data: modelServers, loaded: modelServersLoaded },
  } = React.useContext(ProjectDetailsContext);
  const { pipelinesServer } = usePipelinesAPI();

  const modelServingEnabled = featureFlagEnabled(
    dashboardConfig.spec.dashboardConfig.disableModelServing,
  );
  const pipelinesEnabled =
    featureFlagEnabled(dashboardConfig.spec.dashboardConfig.disablePipelines) &&
    dashboardConfig.status.dependencyOperators.redhatOpenshiftPipelines.available;
  useCheckLogoutParams();

  const scrollableSelectorID = 'project-details-list';
  const sections: SectionType[] = [
    {
      id: ProjectSectionID.WORKBENCHES,
      component: <NotebooksList />,
      isEmpty: notebookStatesLoaded && notebookStates.length === 0,
    },
    {
      id: ProjectSectionID.CLUSTER_STORAGES,
      component: <StorageList />,
      isEmpty: pvcsLoaded && pvcs.length === 0,
    },
    {
      id: ProjectSectionID.DATA_CONNECTIONS,
      component: <DataConnectionsList />,
      isEmpty: connectionsLoaded && connections.length === 0,
    },
    ...(pipelinesEnabled
      ? [
          {
            id: ProjectSectionID.PIPELINES,
            component: <PipelinesSection />,
            isEmpty: !pipelinesServer.installed,
          },
        ]
      : []),
    ...(modelServingEnabled
      ? [
          {
            id: ProjectSectionID.MODEL_SERVER,
            component: <ServingRuntimeList />,
            isEmpty: modelServersLoaded && modelServers.length === 0,
          },
        ]
      : []),
  ];

  // TODO: scrollable selector stop working when tab mode is enabled
  return (
    <PageSection
      id={scrollableSelectorID}
      hasOverflowScroll
      isFilled
      aria-label="project-details-page-section"
      variant="light"
    >
      <GenericSidebar
        sections={sections.map(({ id }) => id)}
        titles={ProjectSectionTitles}
        scrollableSelector={`#${scrollableSelectorID}`}
        maxWidth={175}
      >
        <Stack hasGutter>
          {sections.map(({ id, component, isEmpty }, index) => (
            <React.Fragment key={id}>
              <StackItem
                id={id}
                aria-label={ProjectSectionTitles[id]}
                data-id="details-page-section"
              >
                {component}
              </StackItem>
              {index !== sections.length - 1 && isEmpty && (
                <Divider data-id="details-page-section-divider" />
              )}
            </React.Fragment>
          ))}
        </Stack>
      </GenericSidebar>
    </PageSection>
  );
};

export default ProjectDetailsComponents;
