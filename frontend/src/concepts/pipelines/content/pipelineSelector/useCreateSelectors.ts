import {
  useSelectorSearch,
  UseSelectorSearchValue,
} from '#~/concepts/pipelines/content/pipelineSelector/utils';
import { useActiveExperimentTable } from '#~/concepts/pipelines/content/tables/experiment/useExperimentTable';
import usePipelinesTable from '#~/concepts/pipelines/content/tables/pipeline/usePipelinesTable';
import {
  LoadMoreProps,
  useActiveExperimentLoadMore,
  usePipelineLoadMore,
} from '#~/concepts/pipelines/content/tables/usePipelineLoadMore';
import {
  TableProps,
  TableSortProps,
  getTableSortProps,
} from '#~/concepts/pipelines/content/tables/usePipelineTable';
import { ExperimentKF, PipelineCoreResourceKF, PipelineKF } from '#~/concepts/pipelines/kfTypes';
import { PipelineListPaged } from '#~/concepts/pipelines/types';
import { FetchState } from '#~/utilities/useFetchState';

type UseLoadMoreFunc<T> = [T[], () => Promise<void>];
type UsePipelineSelectorData<DataType> = {
  loaded: boolean;
  initialLoaded: boolean;
  data: DataType[];
  sortProps: TableSortProps;
  onLoadMore: UseLoadMoreFunc<DataType>[1];
  onSearchClear: UseSelectorSearchValue['onClear'];
  fetchedSize: number;
  searchProps: Omit<UseSelectorSearchValue, 'onClear' | 'totalSize'>;
} & Pick<UseSelectorSearchValue, 'totalSize'>;

export const useActiveExperimentSelector = (): UsePipelineSelectorData<ExperimentKF> => {
  const experimentsTable = useActiveExperimentTable();
  const [[{ items: initialData, nextPageToken: initialPageToken }, loaded]] = experimentsTable;

  return useCreateSelector<ExperimentKF>(
    experimentsTable,
    useActiveExperimentLoadMore({
      initialData,
      initialPageToken,
      loaded,
    }),
  );
};

export const usePipelineSelector = (): UsePipelineSelectorData<PipelineKF> => {
  const pipelinesTable = usePipelinesTable();
  const [[{ items: initialData, nextPageToken: initialPageToken }, loaded]] = pipelinesTable;
  return useCreateSelector<PipelineKF>(
    pipelinesTable,
    usePipelineLoadMore({ initialData, initialPageToken, loaded }),
  );
};

const useCreateSelector = <T extends PipelineCoreResourceKF>(
  tableData: [FetchState<PipelineListPaged<T>>, TableProps],
  useLoadMoreFunc: (props: LoadMoreProps) => UseLoadMoreFunc<T>,
): UsePipelineSelectorData<T> => {
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
