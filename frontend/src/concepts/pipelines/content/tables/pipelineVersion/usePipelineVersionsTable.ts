import { FetchState } from '@odh-dashboard/ui-core/hooks/useFetchState';
import usePipelineVersionsForPipeline from '#~/concepts/pipelines/apiHooks/usePipelineVersionsForPipeline';
import createUsePipelineTable, {
  TableProps,
} from '#~/concepts/pipelines/content/tables/usePipelineTable';
import { PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';
import { PipelineListPaged, PipelineOptions } from '#~/concepts/pipelines/types';

export default (
  pipelineId?: string,
): ((limit?: number) => [FetchState<PipelineListPaged<PipelineVersionKF>>, TableProps]) =>
  createUsePipelineTable((options: PipelineOptions) =>
    usePipelineVersionsForPipeline(pipelineId, options),
  );
