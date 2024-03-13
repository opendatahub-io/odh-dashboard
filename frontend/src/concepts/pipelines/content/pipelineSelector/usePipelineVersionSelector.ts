import * as React from 'react';
import { useSelectorSearch } from '~/concepts/pipelines/content/pipelineSelector/utils';
import usePipelineVersionsTable from '~/concepts/pipelines/content/tables/pipelineVersion/usePipelineVersionsTable';
import {
  LoadMoreProps,
  usePipelineVersionLoadMore,
} from '~/concepts/pipelines/content/tables/usePipelineLoadMore';
import {
  TableProps,
  TableSortProps,
  getTableSortProps,
} from '~/concepts/pipelines/content/tables/usePipelineTable';
import { PipelineCoreResourceKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { PipelineListPaged } from '~/concepts/pipelines/types';
import { FetchState } from '~/utilities/useFetchState';

type UsePipelineSelectorData<DataType> = {
  loaded: boolean;
  initialLoaded: boolean;
  data: DataType[];
  sortProps: TableSortProps;
  onLoadMore: () => Promise<void>;
  onSearchClear: (event: React.SyntheticEvent<HTMLButtonElement, Event>) => void;
  totalSize: number;
  fetchedSize: number;
  searchProps: {
    onChange: (event: React.FormEvent<HTMLInputElement>, value: string) => void;
    value?: string | undefined;
  };
};

const usePipelineVersionSelector = (
  pipelineId: string | undefined,
): UsePipelineSelectorData<PipelineVersionKFv2> => {
  const versionsTable = usePipelineVersionsTable(pipelineId)();
  const [[{ items: initialData, nextPageToken: initialPageToken }, loaded]] = versionsTable;
  return useCreateUsePipelineSelector<PipelineVersionKFv2>(
    versionsTable,
    usePipelineVersionLoadMore({ initialData, initialPageToken, loaded }, pipelineId),
  );
};

const useCreateUsePipelineSelector = <T extends PipelineCoreResourceKFv2>(
  tableData: [FetchState<PipelineListPaged<T>>, TableProps],
  useLoadMoreFunc: (props: LoadMoreProps) => [T[], () => Promise<void>],
) => {
  const [[{ totalSize: fetchedSize }, loaded], { initialLoaded, ...tableProps }] = tableData;
  const sortProps = getTableSortProps(tableProps);
  const { sortDirection, sortField, setFilter, filter } = tableProps;
  const [data, onLoadMore] = useLoadMoreFunc({
    sortDirection,
    sortField,
    filter,
  });
  const {
    totalSize,
    onClear: onSearchClear,
    ...searchProps
  } = useSelectorSearch({ setFilter, fetchedSize, loaded });

  return {
    loaded,
    initialLoaded,
    data,
    sortProps,
    onLoadMore,
    onSearchClear,
    totalSize,
    fetchedSize,
    searchProps,
  };
};

export default usePipelineVersionSelector;
