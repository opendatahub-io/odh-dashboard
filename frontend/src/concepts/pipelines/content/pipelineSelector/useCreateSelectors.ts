import * as React from 'react';
import { useSelectorSearch } from '~/concepts/pipelines/content/pipelineSelector/utils';
import useExperimentTable from '~/concepts/pipelines/content/tables/experiment/useExperimentTable';
import usePipelinesTable from '~/concepts/pipelines/content/tables/pipeline/usePipelinesTable';
import usePipelineVersionsTable from '~/concepts/pipelines/content/tables/pipelineVersion/usePipelineVersionsTable';
import {
  LoadMoreProps,
  useExperimentLoadMore,
  usePipelineLoadMore,
  usePipelineVersionLoadMore,
} from '~/concepts/pipelines/content/tables/usePipelineLoadMore';
import {
  TableProps,
  TableSortProps,
  getTableSortProps,
} from '~/concepts/pipelines/content/tables/usePipelineTable';
import {
  ExperimentKFv2,
  PipelineCoreResourceKFv2,
  PipelineKFv2,
  PipelineVersionKFv2,
} from '~/concepts/pipelines/kfTypes';
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

export const useExperimentSelector = (): UsePipelineSelectorData<ExperimentKFv2> => {
  const experimentsTable = useExperimentTable();
  const [[{ items: initialData, nextPageToken: initialPageToken }, loaded]] = experimentsTable;
  return useCreateSelector<ExperimentKFv2>(
    experimentsTable,
    useExperimentLoadMore({ initialData, initialPageToken, loaded }),
  );
};

export const usePipelineSelector = (): UsePipelineSelectorData<PipelineKFv2> => {
  const pipelinesTable = usePipelinesTable();
  const [[{ items: initialData, nextPageToken: initialPageToken }, loaded]] = pipelinesTable;
  return useCreateSelector<PipelineKFv2>(
    pipelinesTable,
    usePipelineLoadMore({ initialData, initialPageToken, loaded }),
  );
};

export const usePipelineVersionSelector = (
  pipelineId: string | undefined,
): UsePipelineSelectorData<PipelineVersionKFv2> => {
  const versionsTable = usePipelineVersionsTable(pipelineId)();
  const [[{ items: initialData, nextPageToken: initialPageToken }, loaded]] = versionsTable;
  return useCreateSelector<PipelineVersionKFv2>(
    versionsTable,
    usePipelineVersionLoadMore({ initialData, initialPageToken, loaded }, pipelineId),
  );
};

const useCreateSelector = <T extends PipelineCoreResourceKFv2>(
  tableData: [FetchState<PipelineListPaged<T>>, TableProps],
  useLoadMore: (props: LoadMoreProps) => [T[], () => Promise<void>],
) => {
  const [[{ totalSize: fetchedSize }, loaded], { initialLoaded, ...tableProps }] = tableData;
  const sortProps = getTableSortProps(tableProps);
  const { sortDirection, sortField, setFilter, filter } = tableProps;
  const [data, onLoadMore] = useLoadMore({
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
