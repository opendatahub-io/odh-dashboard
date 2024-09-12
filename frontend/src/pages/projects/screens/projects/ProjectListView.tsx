import * as React from 'react';
import { useNavigate } from 'react-router-dom';
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
import { columns, subColumns } from './tableData';
import DeleteProjectModal from './DeleteProjectModal';
import ManageProjectModal from './ManageProjectModal';

type ProjectListViewProps = {
  allowCreate: boolean;
};

const ProjectListView: React.FC<ProjectListViewProps> = ({ allowCreate }) => {
  const { projects } = React.useContext(ProjectsContext);
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

  return (
    <>
      <Table
        enablePagination
        variant="compact"
        defaultSortColumn={3}
        data={filteredProjects}
        hasNestedHeader
        columns={columns}
        subColumns={subColumns}
        emptyTableView={<DashboardEmptyTableView onClearFilters={resetFilters} />}
        data-testid="project-view-table"
        rowRenderer={(project) => (
          <ProjectTableRow
            key={project.metadata.uid}
            obj={project}
            isRefreshing={refreshIds.includes(project.metadata.uid || '')}
            setEditData={(data) => setEditData(data)}
            setDeleteData={(data) => setDeleteData(data)}
          />
        )}
        onClearFilters={onClearFilters}
        toolbarContent={
          <ProjectsToolbar
            allowCreate={allowCreate}
            filterData={filterData}
            onFilterUpdate={onFilterUpdate}
          />
        }
      />
      <ManageProjectModal
        open={!!editData}
        onClose={(newProjectName) => {
          if (newProjectName) {
            navigate(`/projects/${newProjectName}`);
            return;
          }

          const refreshId = editData?.metadata.uid;
          if (refreshId) {
            setRefreshIds((otherIds) => [...otherIds, refreshId]);
          }

          setEditData(undefined);

          setRefreshIds((ids) => ids.filter((id) => id !== refreshId));
        }}
        editProjectData={editData}
      />
      <DeleteProjectModal
        deleteData={deleteData}
        onClose={() => {
          setDeleteData(undefined);
        }}
      />
    </>
  );
};

export default ProjectListView;
