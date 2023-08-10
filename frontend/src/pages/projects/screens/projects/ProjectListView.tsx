import * as React from 'react';
import { Button, ButtonVariant, ToolbarItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import Table from '~/components/table/Table';
import useTableColumnSort from '~/components/table/useTableColumnSort';
import SearchField, { SearchType } from '~/pages/projects/components/SearchField';
import { ProjectKind } from '~/k8sTypes';
import { getProjectDisplayName, getProjectOwner } from '~/pages/projects/utils';
import { useAppContext } from '~/app/AppContext';
import LaunchJupyterButton from '~/pages/projects/screens/projects/LaunchJupyterButton';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import NewProjectButton from './NewProjectButton';
import { columns } from './tableData';
import ProjectTableRow from './ProjectTableRow';
import DeleteProjectModal from './DeleteProjectModal';
import ManageProjectModal from './ManageProjectModal';

type ProjectListViewProps = {
  allowCreate: boolean;
};

const ProjectListView: React.FC<ProjectListViewProps> = ({ allowCreate }) => {
  const { dashboardConfig } = useAppContext();
  const { projects: unfilteredProjects, refresh } = React.useContext(ProjectsContext);
  const navigate = useNavigate();
  const [searchType, setSearchType] = React.useState<SearchType>(SearchType.NAME);
  const [search, setSearch] = React.useState('');
  const sort = useTableColumnSort<ProjectKind>(columns, 0);
  const filteredProjects = sort.transformData(unfilteredProjects).filter((project) => {
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

  const searchTypes = React.useMemo(() => Object.values(SearchType), []);

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
          <React.Fragment>
            <ToolbarItem>
              <SearchField
                types={searchTypes}
                searchType={searchType}
                searchValue={search}
                onSearchTypeChange={(searchType) => {
                  setSearchType(searchType);
                }}
                onSearchValueChange={(searchValue) => {
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
            {dashboardConfig.spec.notebookController?.enabled && (
              <ToolbarItem>
                <LaunchJupyterButton variant={ButtonVariant.link} />
              </ToolbarItem>
            )}
          </React.Fragment>
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
