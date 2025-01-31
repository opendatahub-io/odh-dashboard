import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Content, Flex, FlexItem } from '@patternfly/react-core';
import { Table } from '~/components/table';
import { ProjectKind } from '~/k8sTypes';
import { getProjectOwner } from '~/concepts/projects/utils';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import ProjectTableRow from '~/pages/projects/screens/projects/ProjectTableRow';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import ProjectsToolbar from '~/pages/projects/screens/projects/ProjectsToolbar';
import {
  initialProjectsFilterData,
  ProjectsFilterDataType,
} from '~/pages/projects/screens/projects/const';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { AppContext } from '~/app/AppContext';
import { columns } from './tableData';
import DeleteProjectModal from './DeleteProjectModal';
import ManageProjectModal from './ManageProjectModal';

type ProjectListViewProps = {
  allowCreate: boolean;
};

const ProjectListView: React.FC<ProjectListViewProps> = ({ allowCreate }) => {
  const { projects } = React.useContext(ProjectsContext);
  const { favoriteProjects } = React.useContext(AppContext);
  const navigate = useNavigate();
  const [filterData, setFilterData] =
    React.useState<ProjectsFilterDataType>(initialProjectsFilterData);
  const onClearFilters = React.useCallback(
    () => setFilterData(initialProjectsFilterData),
    [setFilterData],
  );
  const filteredProjects = React.useMemo(
    () =>
      projects.filter((project) => {
        const nameFilter = filterData.Name?.toLowerCase();
        const userFilter = filterData.User?.toLowerCase();

        if (
          nameFilter &&
          !getDisplayNameFromK8sResource(project).toLowerCase().includes(nameFilter)
        ) {
          return false;
        }

        return !userFilter || getProjectOwner(project).toLowerCase().includes(userFilter);
      }),
    [projects, filterData],
  );

  const favorites = React.useMemo(
    () =>
      favoriteProjects.reduce<ProjectKind[]>((acc, name) => {
        const project = filteredProjects.find((p) => p.metadata.name === name);
        if (project) {
          acc.push(project);
        }
        return acc;
      }, []),
    [favoriteProjects, filteredProjects],
  );
  const otherProjects = React.useMemo(
    () => filteredProjects.filter((p) => !favoriteProjects.includes(p.metadata.name)),
    [favoriteProjects, filteredProjects],
  );

  const resetFilters = () => {
    setFilterData(initialProjectsFilterData);
  };

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  const [deleteData, setDeleteData] = React.useState<ProjectKind | undefined>();
  const [editData, setEditData] = React.useState<ProjectKind | undefined>();
  const [refreshIds, setRefreshIds] = React.useState<string[]>([]);
  const workbenchEnabled = useIsAreaAvailable(SupportedArea.WORKBENCHES).status;

  const filteredColumns = workbenchEnabled
    ? columns
    : columns.filter((column) => column.field !== 'Workbenches');

  const topTableProps = {
    onClearFilters,
    toolbarContent: (
      <ProjectsToolbar
        allowCreate={allowCreate}
        filterData={filterData}
        onFilterUpdate={onFilterUpdate}
      />
    ),
  };

  return (
    <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }}>
      {favorites.length ? (
        <FlexItem>
          <Table
            enablePagination={false}
            loading={false}
            defaultSortColumn={0}
            data={favorites}
            columns={filteredColumns}
            emptyTableView={<DashboardEmptyTableView onClearFilters={resetFilters} />}
            tableTitle={
              <Content component="h3" style={{ margin: 0 }}>
                Favorite projects
              </Content>
            }
            data-testid="project-view-favorites-table"
            disableRowRenderSupport
            rowRenderer={(project) => (
              <ProjectTableRow
                key={project.metadata.uid}
                obj={project}
                isRefreshing={refreshIds.includes(project.metadata.uid || '')}
                setEditData={(data) => setEditData(data)}
                setDeleteData={(data) => setDeleteData(data)}
              />
            )}
            {...topTableProps}
          />
        </FlexItem>
      ) : null}
      <FlexItem>
        <Table
          enablePagination
          loading={false}
          defaultSortColumn={0}
          data={otherProjects}
          columns={filteredColumns}
          emptyTableView={<DashboardEmptyTableView onClearFilters={resetFilters} />}
          tableTitle={
            favorites.length ? (
              <Content component="h3" style={{ margin: 0 }}>
                Other projects
              </Content>
            ) : null
          }
          data-testid="project-view-table"
          disableRowRenderSupport
          rowRenderer={(project) => (
            <ProjectTableRow
              key={project.metadata.uid}
              obj={project}
              isRefreshing={refreshIds.includes(project.metadata.uid || '')}
              setEditData={(data) => setEditData(data)}
              setDeleteData={(data) => setDeleteData(data)}
            />
          )}
          {...(favorites.length ? {} : topTableProps)}
        />
      </FlexItem>
      {!!editData && (
        <ManageProjectModal
          onClose={(newProjectName) => {
            if (newProjectName) {
              navigate(`/projects/${newProjectName}`);
              return;
            }

            const refreshId = editData.metadata.uid;
            if (refreshId) {
              setRefreshIds((otherIds) => [...otherIds, refreshId]);
            }

            setEditData(undefined);

            setRefreshIds((ids) => ids.filter((id) => id !== refreshId));
          }}
          editProjectData={editData}
        />
      )}
      {deleteData ? (
        <DeleteProjectModal
          deleteData={deleteData}
          onClose={() => {
            setDeleteData(undefined);
          }}
        />
      ) : null}
    </Flex>
  );
};

export default ProjectListView;
