import usePipelineVersionsForPipeline from '~/concepts/pipelines/apiHooks/usePipelineVersionsForPipeline';
import { PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { PipelineListPaged } from '~/concepts/pipelines/types';
import { FetchStateRefreshPromise } from '~/utilities/useFetchState';

const usePipelineTableRowData = (
  pipeline: PipelineKFv2,
): {
  updatedDate: Date;
  totalSize: number;
  loading: boolean;
  refresh: FetchStateRefreshPromise<PipelineListPaged<PipelineVersionKFv2>>;
} => {
  const [{ items, totalSize }, isLoaded, , refresh] = usePipelineVersionsForPipeline(
    pipeline.pipeline_id,
    {
      pageSize: 1,
      sortField: 'created_at',
      sortDirection: 'desc',
    },
  );

  const updatedDate = new Date(items[0]?.created_at || pipeline.created_at);

  return { updatedDate, totalSize, loading: !isLoaded, refresh };
};

export default usePipelineTableRowData;
