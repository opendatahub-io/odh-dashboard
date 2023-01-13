import * as React from 'react';
import { Button, Pagination, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { ProjectKind } from '../../../../k8sTypes';
import useTableColumnSort from '../../../../utilities/useTableColumnSort';
import { getProjectDisplayName, getProjectOwner } from '../../utils';
import ProjectTable from './ProjectTable';
import NewProjectButton from './NewProjectButton';
import { columns } from './tableData';
import { Link } from 'react-router-dom';
import SearchField, { SearchType } from '../../components/SearchField';

const MIN_PAGE_SIZE = 10;

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
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(MIN_PAGE_SIZE);
  const sort = useTableColumnSort<ProjectKind>(columns, 0);
  const filteredProjects = sort.transformData(unfilteredProjects).filter((project) => {
    if (!search) return true;

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

  const searchTypes = React.useMemo(() => Object.keys(SearchType), []);

  return (
    <>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <SearchField
              types={searchTypes}
              searchType={searchType}
              searchValue={search}
              onSearchTypeChange={(searchType) => {
                setSearchType(searchType);
              }}
              onSearchValueChange={(searchValue) => {
                setPage(1);
                setSearch(searchValue);
              }}
            />
          </ToolbarItem>
          <ToolbarItem>
            <NewProjectButton />
          </ToolbarItem>
          <ToolbarItem>
            <Button variant="link">
              <Link to="/notebookController">Launch Jupyter</Link>
            </Button>
          </ToolbarItem>
          <ToolbarItem variant="pagination" alignment={{ default: 'alignRight' }}>
            {pagination('down')}
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <ProjectTable
        clearFilters={resetFilters}
        projects={filteredProjects.slice(pageSize * (page - 1), pageSize * page)}
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
