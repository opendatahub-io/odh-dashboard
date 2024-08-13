import * as React from 'react';
import { useSelectorSearch } from '~/concepts/pipelines/content/pipelineSelector/utils';
import useExperimentTable, {
  useActiveExperimentTable,
} from '~/concepts/pipelines/content/tables/experiment/useExperimentTable';
import usePipelinesTable from '~/concepts/pipelines/content/tables/pipeline/usePipelinesTable';
import {
  LoadMoreProps,
  useExperimentLoadMore,
  usePipelineLoadMore,
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
  PipelinesFilterOp,
  StorageStateKF,
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

export const getExperimentSelector =
  (useTable: typeof useExperimentTable, storageState?: StorageStateKF) =>
  (): UsePipelineSelectorData<ExperimentKFv2> => {
    const experimentsTable = useTable();
    const [[{ items: initialData, nextPageToken: initialPageToken }, loaded]] = experimentsTable;

    return useCreateSelector<ExperimentKFv2>(experimentsTable, () =>
      useExperimentLoadMore({
        initialData,
        initialPageToken,
        loaded,
      })({
        ...(storageState && {
          filter: {
            predicates: [
              {
                key: 'storage_state',
                operation: PipelinesFilterOp.EQUALS,
                // eslint-disable-next-line camelcase
                string_value: storageState,
              },
            ],
          },
        }),
      }),
    );
  };

export const useAllExperimentSelector = getExperimentSelector(useExperimentTable);

export const useActiveExperimentSelector = getExperimentSelector(
  useActiveExperimentTable,
  StorageStateKF.AVAILABLE,
);

export const usePipelineSelector = (): UsePipelineSelectorData<PipelineKFv2> => {
  const pipelinesTable = usePipelinesTable();
  const [[{ items: initialData, nextPageToken: initialPageToken }, loaded]] = pipelinesTable;
  return useCreateSelector<PipelineKFv2>(
    pipelinesTable,
    usePipelineLoadMore({ initialData, initialPageToken, loaded }),
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
