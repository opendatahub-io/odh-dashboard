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

import './DataProjects.scss';
import { CubesIcon } from '@patternfly/react-icons';
import CreateProjectModal from './modals/CreateProjectModal';
import { useDispatch, useSelector } from 'react-redux';
import { State } from '../../redux/types';
import { Project, ProjectList } from '../../types';
import { addNotification } from '../../redux/actions/actions';
import {
  deleteDataProject,
  getDataProject,
  getDataProjects,
} from '../../services/dataProjectsService';
import { useGetDataProjects } from '../../utilities/useGetDataProjects';

const description = `Create new projects, or view everything you've been working on here.`;

export const DataProjects: React.FC = React.memo(() => {
  const dispatch = useDispatch();
  const [viewType, setViewType] = useLocalStorage(VIEW_TYPE);
  const { dataProjects, loaded, loadError, updateDataProjects } = useGetDataProjects();
  const [isCreateProjectModalOpen, setCreateProjectModalOpen] = React.useState(false);
  const [displayedProjects, setDisplayedProjects] = React.useState<Project[]>([]);
  const [isEmpty, setEmpty] = React.useState<boolean>(true);

  React.useEffect(() => {
    setEmpty(!dataProjects || dataProjects.items?.length <= 0);
    setDisplayedProjects(dataProjects ? dataProjects.items || [] : []);
  }, [dataProjects]);

  const watchDataProjectStatus = (project: Project) => {
    let watchHandle;
    const projectName = project.metadata?.name;
    const displayedProject = displayedProjects.find((proj) => proj.metadata.name === projectName);
    if (!displayedProject) {
      return;
    }
    const watchDataProject = () => {
      getDataProject(projectName)
        .then(async (newProject: Project) => {
          if (newProject.status.phase !== displayedProject.status.phase) {
            displayedProject.status.phase = newProject.status.phase;
            updateDataProjects();
          }
          watchHandle = setTimeout(watchDataProject, 2000); // every 2 seconds
        })
        .catch((e) => {
          if (e.statusCode === 404) {
            dispatch(
              addNotification({
                status: 'success',
                title: `Data project ${projectName} deleted successfully.`,
                timestamp: new Date(),
              }),
            );
            updateDataProjects();
          } else {
            dispatch(
              addNotification({
                status: 'danger',
                title: `Error refreshing data projects list.`,
                message: e.message,
                timestamp: new Date(),
              }),
            );
          }
        });
      clearTimeout(watchHandle);
    };
    watchDataProject();
  };

  const handleCreateProjectModalClose = () => {
    setCreateProjectModalOpen(false);
  };

  const onDeleteProject = async (project) => {
    const projectName = project.metadata?.name;
    try {
      await deleteDataProject(projectName);
    } catch (e: any) {
      dispatch(
        addNotification({
          status: 'danger',
          title: `Error deleting data project ${projectName}.`,
          message: e.message,
          timestamp: new Date(),
        }),
      );
      return;
    }
    watchDataProjectStatus(project);
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
        loadError={loadError}
        empty={isEmpty}
        emptyComponent={emptyComponent}
      >
        <DataProjectsHeaderToolbar viewType={viewType || LIST_VIEW} updateViewType={setViewType} />
        <Divider />
        <PageSection variant="light" padding={{ default: 'noPadding' }} isFilled>
          <DataProjectsTableToolbar setCreateProjectModalOpen={setCreateProjectModalOpen} />
          <DataProjectsTable projects={displayedProjects} onDelete={onDeleteProject} />
        </PageSection>
      </ApplicationsPage>
      <CreateProjectModal
        isModalOpen={isCreateProjectModalOpen}
        onClose={handleCreateProjectModalClose}
      />
    </>
  );
});

DataProjects.displayName = 'DataProjects';

export default DataProjects;
