import * as React from 'react';
import { Button, ToolbarItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import Table from '~/components/Table';

import useTableColumnSort from '~/utilities/useTableColumnSort';
import SearchField, { SearchType } from '~/pages/projects/components/SearchField';
import { ProjectKind } from '~/k8sTypes';
import { getProjectDisplayName, getProjectOwner } from '~/pages/projects/utils';
import NewProjectButton from './NewProjectButton';
import { columns } from './tableData';
import ProjectTableRow from './ProjectTableRow';
import DeleteProjectModal from './DeleteProjectModal';
import ManageProjectModal from './ManageProjectModal';

type ProjectListViewProps = {
  projects: ProjectKind[];
  refreshProjects: () => Promise<void>;
};

const ProjectListView: React.FC<ProjectListViewProps> = ({
  projects: unfilteredProjects,
  refreshProjects,
}) => {
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

  const searchTypes = React.useMemo(() => Object.keys(SearchType), []);

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
            <ToolbarItem>
              <NewProjectButton />
            </ToolbarItem>
            <ToolbarItem>
              <Button
                variant="link"
                component={() => <Link to="/notebookController">Launch Jupyter</Link>}
              />
            </ToolbarItem>
          </React.Fragment>
        }
      />
      <ManageProjectModal
        open={!!editData}
        onClose={() => {
          const refreshId = editData?.metadata.uid;
          if (refreshId) {
            setRefreshIds((otherIds) => [...otherIds, refreshId]);
          }
          setEditData(undefined);

          refreshProjects()
            .then(() => setRefreshIds((ids) => ids.filter((id) => id !== refreshId)))
            /* eslint-disable-next-line no-console */
            .catch((e) => console.error('Failed refresh', e));
        }}
        editProjectData={editData}
      />
      <DeleteProjectModal
        deleteData={deleteData}
        onClose={(deleted) => {
          setDeleteData(undefined);
          if (deleted) {
            /* eslint-disable-next-line no-console */
            refreshProjects().catch((e) => console.error('Failed refresh', e));
          }
        }}
      />
    </>
  );
};

export default ProjectListView;
