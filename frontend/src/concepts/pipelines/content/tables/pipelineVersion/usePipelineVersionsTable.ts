import usePipelineVersionsForPipeline from '~/concepts/pipelines/apiHooks/usePipelineVersionsForPipeline';
import createUsePipelineTable, {
  TableProps,
} from '~/concepts/pipelines/content/tables/usePipelineTable';
import { PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { PipelineListPaged, PipelineOptions } from '~/concepts/pipelines/types';
import { FetchState } from '~/utilities/useFetchState';

export default (
  pipelineId?: string,
): ((limit?: number) => [FetchState<PipelineListPaged<PipelineVersionKFv2>>, TableProps]) =>
  createUsePipelineTable((options: PipelineOptions) =>
    usePipelineVersionsForPipeline(pipelineId, options),
  );
