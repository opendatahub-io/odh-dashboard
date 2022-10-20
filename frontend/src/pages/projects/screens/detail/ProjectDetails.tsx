import {
  Breadcrumb,
  BreadcrumbItem,
  Divider,
  PageSection,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import * as React from 'react';
import ApplicationsPage from '../../../ApplicationsPage';
import { useCurrentProjectDisplayName } from '../../utils';
import { ProjectSectionTitles } from './const';
import DataConnectionsList from './data-connections/DataConnectionsList';
import GenericSidebar from '../../components/GenericSidebar';
import StorageList from './storage/StorageList';
import { ProjectSectionID } from './types';
import WorkspacesList from './workspaces/WorkspacesList';
import { Link } from 'react-router-dom';

type SectionType = {
  id: ProjectSectionID;
  component: React.ReactNode;
};

const ProjectDetails: React.FC = () => {
  const scrollableSelectorID = 'project-details-list';
  const displayName = useCurrentProjectDisplayName();

  const sections: SectionType[] = [
    { id: ProjectSectionID.WORKSPACE, component: <WorkspacesList /> },
    { id: ProjectSectionID.STORAGE, component: <StorageList /> },
    { id: ProjectSectionID.DATA_CONNECTIONS, component: <DataConnectionsList /> },
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

  const breadcrumb = (
    <Breadcrumb>
      <BreadcrumbItem render={() => <Link to="/projects">Data science projects</Link>} />
      <BreadcrumbItem isActive>{`${displayName}`}</BreadcrumbItem>
    </Breadcrumb>
  );

  return (
    <ApplicationsPage
      title={`${displayName} project details`}
      breadcrumb={breadcrumb}
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
          sections={Object.values(ProjectSectionID)}
          titles={ProjectSectionTitles}
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
