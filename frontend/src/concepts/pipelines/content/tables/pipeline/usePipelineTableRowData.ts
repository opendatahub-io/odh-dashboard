import usePipelineVersionsForPipeline from '#~/concepts/pipelines/apiHooks/usePipelineVersionsForPipeline';
import { PipelineKF, PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';
import { PipelineListPaged } from '#~/concepts/pipelines/types';
import { FetchStateRefreshPromise } from '#~/utilities/useFetchState';

const usePipelineTableRowData = (
  pipeline: PipelineKF,
): {
  version: PipelineVersionKF | undefined;
  updatedDate: Date;
  totalSize: number;
  loading: boolean;
  refresh: FetchStateRefreshPromise<PipelineListPaged<PipelineVersionKF>>;
} => {
  const [{ items, totalSize }, isLoaded, , refresh] = usePipelineVersionsForPipeline(
    pipeline.pipeline_id,
    {
      pageSize: 1,
      sortField: 'created_at',
      sortDirection: 'desc',
    },
  );
  const latestVersion = isLoaded ? items[0] : undefined;
  const updatedDate = new Date(latestVersion?.created_at || pipeline.created_at);

  return { version: latestVersion, updatedDate, totalSize, loading: !isLoaded, refresh };
};

export default usePipelineTableRowData;
