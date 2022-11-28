import * as React from 'react';
import { Pagination, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { InferenceServiceKind, ServingRuntimeKind } from '../../../../k8sTypes';
import useTableColumnSort from '../../../../utilities/useTableColumnSort';
import { getInferenceServiceDisplayName } from './utils';
import ServeModelButton from './ServeModelButton';
import { inferenceServiceColumns } from './data';
import SearchField, { SearchType } from '../../../projects/components/SearchField';
import InferenceServiceTable from './InferenceServiceTable';
import { ModelServingContext } from '../../ModelServingContext';

const MIN_PAGE_SIZE = 10;

type InferenceServiceListViewProps = {
  inferenceServices: InferenceServiceKind[];
  servingRuntimes: ServingRuntimeKind[];
};

const InferenceServiceListView: React.FC<InferenceServiceListViewProps> = ({
  inferenceServices: unfilteredInferenceServices,
  servingRuntimes,
}) => {
  const {
    inferenceServices: { refresh },
  } = React.useContext(ModelServingContext);
  const [searchType, setSearchType] = React.useState<SearchType>(SearchType.NAME);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(MIN_PAGE_SIZE);
  const sortInferenceService = useTableColumnSort<InferenceServiceKind>(inferenceServiceColumns, 0);
  const filteredInferenceServices = sortInferenceService
    .transformData(unfilteredInferenceServices)
    .filter((project) => {
      if (!search) return true;

      switch (searchType) {
        case SearchType.NAME:
          return getInferenceServiceDisplayName(project)
            .toLowerCase()
            .includes(search.toLowerCase());
        default:
          return true;
      }
    });

  const resetFilters = () => {
    setSearch('');
  };

  const showPagination = unfilteredInferenceServices.length > MIN_PAGE_SIZE;
  const pagination = (pageDirection: 'up' | 'down') =>
    showPagination && (
      <Pagination
        dropDirection={pageDirection}
        perPageComponent="button"
        itemCount={filteredInferenceServices.length}
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

  const searchTypes = React.useMemo(
    () => Object.keys(SearchType).filter((key) => SearchType[key] === SearchType.NAME),
    [],
  );

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
            <ServeModelButton />
          </ToolbarItem>
          <ToolbarItem variant="pagination" alignment={{ default: 'alignRight' }}>
            {pagination('down')}
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <InferenceServiceTable
        clearFilters={resetFilters}
        servingRuntimes={servingRuntimes}
        inferenceServices={filteredInferenceServices.slice(pageSize * (page - 1))}
        getColumnSort={sortInferenceService.getColumnSort}
        refresh={refresh}
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

export default InferenceServiceListView;
