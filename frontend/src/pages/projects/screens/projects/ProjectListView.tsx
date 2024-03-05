import * as React from 'react';
import { Button, ButtonVariant, ToolbarItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { Table } from '~/components/table';
import DashboardSearchField, { SearchType } from '~/concepts/dashboard/DashboardSearchField';
import { ProjectKind } from '~/k8sTypes';
import { getProjectDisplayName, getProjectOwner } from '~/pages/projects/utils';
import LaunchJupyterButton from '~/pages/projects/screens/projects/LaunchJupyterButton';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { ProjectScope } from '~/pages/projects/types';
import NewProjectButton from './NewProjectButton';
import { columns } from './tableData';
import ProjectTableRow from './ProjectTableRow';
import DeleteProjectModal from './DeleteProjectModal';
import ManageProjectModal from './ManageProjectModal';

type ProjectListViewProps = {
  allowCreate: boolean;
  scope: ProjectScope;
};

const ProjectListView: React.FC<ProjectListViewProps> = ({ allowCreate, scope }) => {
  const { projects, dataScienceProjects, refresh } = React.useContext(ProjectsContext);
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
        data={filteredProjects}
        columns={columns}
        emptyTableView={
          <>
            No projects match your filters.{' '}
            <Button variant="link" isInline onClick={resetFilters}>
              Clear filters
            </Button>
          </>
        }
        data-id="project-view-table"
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
            {allowCreate && (
              <ToolbarItem>
                <NewProjectButton
                  onProjectCreated={(projectName) => navigate(`/projects/${projectName}`)}
                />
              </ToolbarItem>
            )}
            <ToolbarItem>
              <LaunchJupyterButton variant={ButtonVariant.link} />
            </ToolbarItem>
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
        onClose={(deleted) => {
          if (deleted) {
            refresh();
          }
          setDeleteData(undefined);
        }}
      />
    </>
  );
};

export default ProjectListView;
