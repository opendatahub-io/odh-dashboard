import * as React from 'react';
import { Button, ButtonVariant, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { Table } from '~/components/table';
import DashboardSearchField, { SearchType } from '~/concepts/dashboard/DashboardSearchField';
import { ProjectKind } from '~/k8sTypes';
import { getProjectDisplayName, getProjectOwner } from '~/concepts/projects/utils';
import { useAppContext } from '~/app/AppContext';
import LaunchJupyterButton from '~/pages/projects/screens/projects/LaunchJupyterButton';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { ProjectScope } from '~/pages/projects/types';
import ProjectTableRow from '~/pages/projects/screens/projects/ProjectTableRow';
import NewProjectButton from './NewProjectButton';
import { columns, subColumns } from './tableData';
import DeleteProjectModal from './DeleteProjectModal';
import ManageProjectModal from './ManageProjectModal';

type ProjectListViewProps = {
  allowCreate: boolean;
  scope: ProjectScope;
};

const ProjectListView: React.FC<ProjectListViewProps> = ({ allowCreate, scope }) => {
  const { dashboardConfig } = useAppContext();
  const { projects, dataScienceProjects } = React.useContext(ProjectsContext);
  const navigate = useNavigate();
  const [searchType, setSearchType] = React.useState<SearchType>(SearchType.NAME);
  const [search, setSearch] = React.useState('');
  const filteredProjects = (
    scope === ProjectScope.ALL_PROJECTS ? projects : dataScienceProjects
  ).filter((project) => {
    if (!search) {
      return true;
    }

    switch (searchType) {
      case SearchType.NAME:
        return getProjectDisplayName(project).toLowerCase().includes(search.toLowerCase());
      case SearchType.USER:
        return getProjectOwner(project).toLowerCase().includes(search.toLowerCase());
      default:
        return true;
    }
  });

  const resetFilters = () => {
    setSearch('');
  };

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
        emptyTableView={
          <>
            No projects match your filters.{' '}
            <Button variant="link" isInline onClick={resetFilters}>
              Clear filters
            </Button>
          </>
        }
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
        toolbarContent={
          <>
            <ToolbarGroup>
              <ToolbarItem>
                <DashboardSearchField
                  types={[SearchType.NAME, SearchType.USER]}
                  searchType={searchType}
                  searchValue={search}
                  onSearchTypeChange={(newSearchType: SearchType) => {
                    setSearchType(newSearchType);
                  }}
                  onSearchValueChange={(searchValue: string) => {
                    setSearch(searchValue);
                  }}
                />
              </ToolbarItem>
            </ToolbarGroup>
            <ToolbarGroup align={{ default: 'alignRight' }}>
              {dashboardConfig.spec.notebookController?.enabled && (
                <ToolbarItem>
                  <LaunchJupyterButton variant={ButtonVariant.link} />
                </ToolbarItem>
              )}
              {allowCreate && (
                <ToolbarItem>
                  <NewProjectButton
                    onProjectCreated={(projectName) => navigate(`/projects/${projectName}`)}
                  />
                </ToolbarItem>
              )}
            </ToolbarGroup>
          </>
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
