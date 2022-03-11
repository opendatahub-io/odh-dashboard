import * as React from 'react';
import {
  Divider,
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
import DataProjectsTableToolbar from './DataProjectsTableToolbar';
import DataProjectsTable from './DataProjectsTable';
import { projects } from './mockData';

import './DataProjects.scss';
import { CubesIcon } from '@patternfly/react-icons';
import CreateProjectModal from './modals/CreateProjectModal';

const description = `Create new projects, or view everything you've been working on here.`;

export const DataProjects: React.FC = () => {
  const loaded = true; // temp
  const isEmpty = false; // temp
  const [viewType, setViewType] = useLocalStorage(VIEW_TYPE);
  const [isCreateProjectModalOpen, setCreateProjectModalOpen] = React.useState(false);

  const handleCreateProjectModalClose = () => {
    setCreateProjectModalOpen(false);
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
          <DataProjectsTableToolbar setCreateProjectModalOpen={setCreateProjectModalOpen} />
          <DataProjectsTable projects={projects} />
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
