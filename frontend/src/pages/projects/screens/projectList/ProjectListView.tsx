import * as React from 'react';
import { Divider, Pagination, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { ProjectKind } from '../../../../k8sTypes';
import useTableColumnSort from '../../../../utilities/useTableColumnSort';
import { getProjectDisplayName } from '../../utils';
import ProjectTable from './ProjectTable';
import FilterToolbar from './FilterToolbar';
import NewProjectButton from './NewProjectButton';
import { columns } from './tableData';

const MIN_PAGE_SIZE = 10;

type ProjectListViewProps = {
  projects: ProjectKind[];
  refreshProjects: () => Promise<void>;
};

const ProjectListView: React.FC<ProjectListViewProps> = ({
  projects: unfilteredProjects,
  refreshProjects,
}) => {
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(MIN_PAGE_SIZE);
  const sort = useTableColumnSort<ProjectKind>(columns, 0);
  const filteredProjects = sort
    .transformData(unfilteredProjects)
    .filter((project) =>
      !search ? true : getProjectDisplayName(project).toLowerCase().includes(search.toLowerCase()),
    );

  const showPagination = unfilteredProjects.length > MIN_PAGE_SIZE;
  const pagination = (pageDirection: 'up' | 'down') =>
    showPagination && (
      <Pagination
        dropDirection={pageDirection}
        perPageComponent="button"
        itemCount={filteredProjects.length}
        perPage={pageSize}
        page={page}
        onSetPage={(e, newPage) => setPage(newPage)}
        onPerPageSelect={(e, newSize, newPage) => {
          setPageSize(newSize);
          setPage(newPage);
        }}
        widgetId="table-pagination"
      />
    );

  return (
    <>
      <FilterToolbar
        search={search}
        setSearch={(newSearch) => {
          setSearch(newSearch);
          setPage(1);
        }}
      />
      <Divider />
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <NewProjectButton />
          </ToolbarItem>
          <ToolbarItem variant="pagination" alignment={{ default: 'alignRight' }}>
            {pagination('down')}
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <ProjectTable
        projects={filteredProjects.slice(pageSize * (page - 1))}
        getColumnSort={sort.getColumnSort}
        refreshProjects={refreshProjects}
      />
      {showPagination && (
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem variant="pagination" alignment={{ default: 'alignRight' }}>
              {pagination('up')}
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      )}
    </>
  );
};

export default ProjectListView;
