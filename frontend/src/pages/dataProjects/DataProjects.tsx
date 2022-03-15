import * as React from 'react';
import { useHistory } from 'react-router-dom';
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
import { ProjectList } from '../../types';
import { getDataProjects } from '../../redux/actions/actions';
import { deleteDataProject } from '../../services/dataProjectsService';

const description = `Create new projects, or view everything you've been working on here.`;

export const DataProjects: React.FC = () => {
  const history = useHistory();

  const [viewType, setViewType] = useLocalStorage(VIEW_TYPE);
  const [isTableDrawerExpanded, setTableDrawerExpanded] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState(null);
  const [isCreateProjectModalOpen, setCreateProjectModalOpen] = React.useState(false);

  const dataProjects: ProjectList | null | undefined = useSelector<
    State,
    ProjectList | null | undefined
  >((state) => state.dataProjectsState.dataProjects);
  const username: string | null | undefined = useSelector<State, string | null | undefined>(
    (state) => state.appState.user,
  );
  const dataProjectsLoading: boolean = useSelector<State, boolean>(
    (state) => state.dataProjectsState.dataProjectsLoading,
  );
  const dataProjectsError: Error | undefined = useSelector<State, Error | undefined>(
    (state) => state.dataProjectsState.dataProjectsError || undefined,
  );

  const displayedProjects = dataProjects ? dataProjects.items || [] : [];
  const isEmpty = !dataProjects || dataProjects.items?.length <= 0;
  const loaded = !!username && !dataProjectsLoading;
  const dispatch = useDispatch();

  const loadDataProjects = () => {
    if (username) {
      dispatch(getDataProjects());
    }
  };

  React.useEffect(() => {
    loadDataProjects();
  }, [username, dispatch]);

  const handleCreateProjectModalClose = () => {
    setCreateProjectModalOpen(false);
  };

  // const onProjectSelect = (project) => {
  //   history.push(`/data-projects/${project.metadata?.name}`);
  // };

  const onDeleteProject = (project) => {
    deleteDataProject(project.metadata?.name).then(loadDataProjects);
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
        loadError={dataProjectsError}
        empty={isEmpty}
        emptyComponent={emptyComponent}
      >
        <DataProjectsHeaderToolbar viewType={viewType || LIST_VIEW} updateViewType={setViewType} />
        <Divider />
        <PageSection variant="light" padding={{ default: 'noPadding' }} isFilled>
          <DataProjectsTableToolbar setCreateProjectModalOpen={setCreateProjectModalOpen} />
          <DataProjectsTable projects={displayedProjects} onDelete={onDeleteProject}/>
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
