import usePipelineVersionsForPipeline from '~/concepts/pipelines/apiHooks/usePipelineVersionsForPipeline';
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { PipelineListPaged } from '~/concepts/pipelines/types';
import { FetchStateRefreshPromise } from '~/utilities/useFetchState';

const usePipelineTableRowData = (
  pipeline: PipelineKF,
): {
  updatedDate: Date;
  totalSize: number;
  loading: boolean;
  refresh: FetchStateRefreshPromise<PipelineListPaged<PipelineVersionKF>>;
} => {
  const [{ items, totalSize }, isLoaded, , refresh] = usePipelineVersionsForPipeline(pipeline.id, {
    pageSize: 1,
    sortField: 'created_at',
    sortDirection: 'desc',
  });

  const updatedDate = new Date(items[0]?.created_at || pipeline.created_at);

  return { updatedDate, totalSize, loading: !isLoaded, refresh };
};

export default usePipelineTableRowData;
