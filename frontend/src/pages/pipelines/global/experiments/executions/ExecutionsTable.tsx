import * as React from 'react';
import { TableBase } from '#~/components/table';
import { Execution } from '#~/third_party/mlmd';
import ExecutionsTableRow from '#~/pages/pipelines/global/experiments/executions/ExecutionsTableRow';
import { executionColumns } from '#~/pages/pipelines/global/experiments/executions/columns';
import { useMlmdListContext } from '#~/concepts/pipelines/context';
import { initialFilterData } from '#~/pages/pipelines/global/experiments/executions/const';
import ExecutionsTableToolbar from '#~/pages/pipelines/global/experiments/executions/ExecutionsTableToolbar';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';

interface ExecutionsTableProps {
  executions: Execution[];
  nextPageToken: string | undefined;
  isLoaded: boolean;
}

const ExecutionsTable: React.FC<ExecutionsTableProps> = ({
  executions,
  nextPageToken,
  isLoaded,
}) => {
  const {
    maxResultSize,
    setPageToken: setRequestToken,
    setMaxResultSize,
  } = useMlmdListContext(nextPageToken);

  const [page, setPage] = React.useState(1);
  const [filterData, setFilterData] = React.useState(initialFilterData);
  const [pageTokens, setPageTokens] = React.useState<Record<number, string>>({});

  const onClearFilters = React.useCallback(() => setFilterData(initialFilterData), [setFilterData]);

  const onNextPageClick = React.useCallback(
    (_: React.SyntheticEvent<HTMLButtonElement>, nextPage: number) => {
      if (nextPageToken) {
        setPageTokens((prevTokens) => ({ ...prevTokens, [nextPage]: nextPageToken }));
        setRequestToken(nextPageToken);
        setPage(nextPage);
      }
    },
    [nextPageToken, setRequestToken],
  );

  const onPrevPageClick = React.useCallback(
    (_: React.SyntheticEvent<HTMLButtonElement>, prevPage: number) => {
      if (pageTokens[prevPage]) {
        setRequestToken(pageTokens[prevPage]);
        setPage(prevPage);
      } else {
        setRequestToken(undefined);
      }
    },
    [pageTokens, setRequestToken],
  );

  return (
    <TableBase
      variant="compact"
      loading={!isLoaded}
      enablePagination="compact"
      data={executions}
      columns={executionColumns}
      data-testid="executions-list-table"
      rowRenderer={(execution) => <ExecutionsTableRow key={execution.getId()} obj={execution} />}
      toggleTemplate={() => <>{maxResultSize} per page </>}
      toolbarContent={
        <ExecutionsTableToolbar filterData={filterData} setFilterData={setFilterData} />
      }
      onClearFilters={onClearFilters}
      page={page}
      perPage={maxResultSize}
      disableItemCount
      onNextClick={onNextPageClick}
      onPreviousClick={onPrevPageClick}
      onPerPageSelect={(_, newSize) => {
        setMaxResultSize(newSize);
      }}
      onSetPage={(_, newPage) => {
        if (newPage < page || !isLoaded) {
          setPage(newPage);
        }
      }}
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      id="executions-list-table"
    />
  );
};

export default ExecutionsTable;
