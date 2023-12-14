import usePipelineVersionsForPipeline from '~/concepts/pipelines/apiHooks/usePipelineVersionsForPipeline';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';

const usePipelineTableRowData = (pipeline: PipelineKF) => {
  const [{ items, totalSize }, isLoaded, , refresh] = usePipelineVersionsForPipeline(pipeline.id, {
    pageSize: 1,
    sortField: 'created_at',
    sortDirection: 'desc',
  });

  const updatedDate = new Date(items[0]?.created_at || pipeline.created_at);

  return { updatedDate, totalSize, loading: !isLoaded, refresh };
};

export default usePipelineTableRowData;
