import usePipelineVersionsForPipeline from '~/concepts/pipelines/apiHooks/usePipelineVersionsForPipeline';
import { PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { PipelineListPaged } from '~/concepts/pipelines/types';
import { FetchStateRefreshPromise } from '~/utilities/useFetchState';

const usePipelineTableRowData = (
  pipeline: PipelineKFv2,
): {
  version: PipelineVersionKFv2 | undefined;
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
  const latestVersion = isLoaded ? items[0] : undefined;
  const updatedDate = new Date(latestVersion?.created_at || pipeline.created_at);

  return { version: latestVersion, updatedDate, totalSize, loading: !isLoaded, refresh };
};

export default usePipelineTableRowData;
