import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Table } from '#~/components/table';
import { KnownLabels, ProjectKind } from '#~/k8sTypes';
import { getProjectOwner } from '#~/concepts/projects/utils';
import { ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import ProjectTableRow from '#~/pages/projects/screens/projects/ProjectTableRow';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import ProjectsToolbar from '#~/pages/projects/screens/projects/ProjectsToolbar';
import {
  aiProjectFilterKey,
  initialProjectsFilterData,
  ProjectsFilterDataType,
} from '#~/pages/projects/screens/projects/const';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { useBrowserStorage } from '#~/components/browserStorage/BrowserStorageContext';
import { columns } from './tableData';
import DeleteProjectModal from './DeleteProjectModal';
import ManageProjectModal from './ManageProjectModal';

const PROJECT_FILTER_STORAGE_KEY = 'odh.dashboard.projects.type.filter';

type ProjectListViewProps = {
  allowCreate: boolean;
};

export const isAiProject = (project: ProjectKind): boolean => {
  return project.metadata.labels?.[KnownLabels.DASHBOARD_RESOURCE] === 'true';
};

const getAiProjects = (projects: ProjectKind[]) => {
  return projects.filter((project) => {
    return isAiProject(project);
  });
};

const ProjectListView: React.FC<ProjectListViewProps> = ({ allowCreate }) => {
  const { projects } = React.useContext(ProjectsContext);
  const navigate = useNavigate();
  const [projectFilter, setProjectFilter] = useBrowserStorage<string>(
    PROJECT_FILTER_STORAGE_KEY,
    aiProjectFilterKey,
    true,
    true,
  );

  const [filterData, setFilterData] =
    React.useState<ProjectsFilterDataType>(initialProjectsFilterData);
  const onClearFilters = React.useCallback(
    () => setFilterData(initialProjectsFilterData),
    [setFilterData, projectFilter],
  );

  const [aiProjectNum, setAiProjectNum] = React.useState(0);
  const [fullProjectNum, setFullProjectNum] = React.useState(projects.length || 0);

  React.useEffect(() => {
    setAiProjectNum(getAiProjects(projects).length || 0);
    setFullProjectNum(projects.length || 0);
  }, [projects]);

  const filteredProjects = React.useMemo(
    () =>
      projects.filter((project) => {
        const nameFilter = filterData.Name?.toLowerCase();
        const userFilter = filterData.User?.toLowerCase();
        const aiProjectFilter = projectFilter === aiProjectFilterKey;

        if (aiProjectFilter) {
          if (!isAiProject(project)) {
            return false;
          }
        }
        if (
          nameFilter &&
          !getDisplayNameFromK8sResource(project).toLowerCase().includes(nameFilter)
        ) {
          return false;
        }

        return !userFilter || getProjectOwner(project).toLowerCase().includes(userFilter);
      }),
    [projects, filterData, projectFilter],
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

  return (
    <>
      <Table
        enablePagination
        loading={false}
        defaultSortColumn={0}
        data={filteredProjects}
        columns={filteredColumns}
        emptyTableView={<DashboardEmptyTableView onClearFilters={resetFilters} />}
        data-testid="project-view-table"
        disableRowRenderSupport
        rowRenderer={(project) => (
          <ProjectTableRow
            key={project.metadata.uid}
            obj={project}
            isRefreshing={refreshIds.includes(project.metadata.uid || '')}
            setEditData={(data) => setEditData(data)}
            setDeleteData={(data) => setDeleteData(data)}
            currentProjectFilterType={projectFilter}
          />
        )}
        onClearFilters={onClearFilters}
        toolbarContent={
          <ProjectsToolbar
            setProjectFilter={setProjectFilter}
            projectFilter={projectFilter}
            allowCreate={allowCreate}
            filterData={filterData}
            onFilterUpdate={onFilterUpdate}
            aiProjectNum={aiProjectNum}
            fullProjectNum={fullProjectNum}
          />
        }
      />
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
    </>
  );
};

export default ProjectListView;
