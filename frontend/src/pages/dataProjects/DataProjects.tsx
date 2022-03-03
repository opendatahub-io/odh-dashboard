import * as React from 'react';
import {
  Divider,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  PageSection,
  EmptyState,
  EmptyStateIcon,
  Title,
  EmptyStateBody,
  Button,
  EmptyStateSecondaryActions,
} from '@patternfly/react-core';
import ApplicationsPage from '../ApplicationsPage';
import DataProjectsHeaderToolbar from './DataProjectsHeaderToolbar';
import { LIST_VIEW, VIEW_TYPE } from './const';
import { useLocalStorage } from '../../utilities/useLocalStorage';
import DataProjectsDrawerPanel from './DataProjectsDrawerPanel';
import DataProjectsTableToolbar from './DataProjectsTableToolbar';
import DataProjectsTable from './DataProjectsTable';
import { projects } from './mockData';

import './DataProjects.scss';
import { CubesIcon } from '@patternfly/react-icons';
import CreateProjectModal from './CreateProjectModal';

const description = `Create new projects, or view everything you've been working on here.`;

export const DataProjects: React.FC = () => {
  const loaded = true; // temp
  const isEmpty = false; // temp
  const [viewType, setViewType] = useLocalStorage(VIEW_TYPE);
  const [isTableDrawerExpanded, setTableDrawerExpanded] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState(null);
  const [isCreateProjectModalOpen, setCreateProjectModalOpen] = React.useState(false);

  const handleCreateProjectModalClose = () => {
    setCreateProjectModalOpen(false);
  };

  const onProjectSelect = (project) => {
    setSelectedProject(project);
    setTableDrawerExpanded(true);
  };

  const onDrawerPanelClose = () => {
    setSelectedProject(null);
    setTableDrawerExpanded(false);
  };

  const emptyComponent = (
    <PageSection variant="light" padding={{ default: 'noPadding' }} isFilled>
      <EmptyState variant="large">
        <EmptyStateIcon icon={CubesIcon} />
        <Title headingLevel="h5" size="lg">
          You have no data projects yet.
        </Title>
        <EmptyStateBody>
          We&apos;ll keep track of all the awesome data models you&apos;ve created. Click below to
          get started. Alternatively, you can launch JupyterHub to get right into a notebook.
        </EmptyStateBody>
        <Button variant="primary" onClick={() => setCreateProjectModalOpen(true)}>
          Create data project
        </Button>
        <EmptyStateSecondaryActions>
          <Button variant="link">Launch Notebook</Button>
        </EmptyStateSecondaryActions>
      </EmptyState>
    </PageSection>
  );

  return (
    <>
      <ApplicationsPage
        title="Projects"
        description={description}
        loaded={loaded}
        empty={isEmpty}
        emptyComponent={emptyComponent}
      >
        <DataProjectsHeaderToolbar viewType={viewType || LIST_VIEW} updateViewType={setViewType} />
        <Divider />
        <PageSection variant="light" padding={{ default: 'noPadding' }} isFilled>
          <Drawer isExpanded={isTableDrawerExpanded}>
            <DrawerContent
              panelContent={
                <DataProjectsDrawerPanel
                  selectedProject={selectedProject}
                  onClose={onDrawerPanelClose}
                />
              }
            >
              <DrawerContentBody>
                <DataProjectsTableToolbar setCreateProjectModalOpen={setCreateProjectModalOpen} />
                <DataProjectsTable projects={projects} onSelect={onProjectSelect} />
              </DrawerContentBody>
            </DrawerContent>
          </Drawer>
        </PageSection>
      </ApplicationsPage>
      <CreateProjectModal
        isModalOpen={isCreateProjectModalOpen}
        onClose={handleCreateProjectModalClose}
      />
    </>
  );
};
DataProjects.displayName = 'DataProjects';

export default DataProjects;
