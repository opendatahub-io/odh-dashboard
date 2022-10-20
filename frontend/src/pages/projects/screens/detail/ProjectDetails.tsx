import { Divider, PageSection, Stack, StackItem } from '@patternfly/react-core';
import * as React from 'react';
import ApplicationsPage from '../../../ApplicationsPage';
import { useCurrentProjectDisplayName } from '../../utils';
import DataConnectionsList from './data-connections/DataConnectionsList';
import { ProjectSectionTitles, ProjectSectionTitlesExtended } from './const';
import GenericSidebar from '../../components/GenericSidebar';
import StorageList from './storage/StorageList';
import { ProjectSectionID } from './types';
import WorkspacesList from './workspaces/WorkspacesList';
import { useAppContext } from 'app/AppContext';
import ModelServerList from './ModelServerList';

type SectionType = {
  id: ProjectSectionID;
  component: React.ReactNode;
};

const ProjectDetails: React.FC = () => {
  const scrollableSelectorID = 'project-details-list';
  const displayName = useCurrentProjectDisplayName();
  const { dashboardConfig } = useAppContext();
  const modelServingEnabled = dashboardConfig.spec.dashboardConfig.disableModelServing;

  const sections: SectionType[] = [
    { id: ProjectSectionID.WORKSPACE, component: <WorkspacesList /> },
    { id: ProjectSectionID.STORAGE, component: <StorageList /> },
    { id: ProjectSectionID.DATA_CONNECTIONS, component: <DataConnectionsList /> },
    ...(!modelServingEnabled
      ? [{ id: ProjectSectionID.MODEL_SERVER, component: <ModelServerList /> }]
      : []),
  ];

  const mapSections = (
    id: ProjectSectionID,
    component: React.ReactNode,
    index: number,
    array: SectionType[],
  ) => (
    <React.Fragment key={id}>
      <StackItem>{component}</StackItem>
      {index !== array.length - 1 && <Divider />}
    </React.Fragment>
  );

  return (
    <ApplicationsPage
      title={`${displayName} project details`}
      description={null}
      loaded
      empty={false}
    >
      <PageSection
        id={scrollableSelectorID}
        hasOverflowScroll
        aria-label="project-details-page-section"
        variant="light"
      >
        <GenericSidebar
          sections={Object.keys(
            modelServingEnabled
              ? ProjectSectionTitles
              : { ...ProjectSectionTitles, ...ProjectSectionTitlesExtended },
          )}
          titles={modelServingEnabled ? ProjectSectionTitles : ProjectSectionTitlesExtended}
          scrollableSelector={`#${scrollableSelectorID}`}
        >
          <Stack hasGutter>
            {sections.map(({ id, component }, index, array) =>
              mapSections(id, component, index, array),
            )}
          </Stack>
        </GenericSidebar>
      </PageSection>
    </ApplicationsPage>
  );
};

export default ProjectDetails;
