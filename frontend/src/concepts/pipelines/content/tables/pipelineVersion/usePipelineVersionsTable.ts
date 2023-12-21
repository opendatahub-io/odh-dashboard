import usePipelineVersionsForPipeline from '~/concepts/pipelines/apiHooks/usePipelineVersionsForPipeline';
import createUsePipelineTable from '~/concepts/pipelines/content/tables/usePipelineTable';
import { PipelineOptions } from '~/concepts/pipelines/types';

export default (pipelineId?: string) =>
  createUsePipelineTable((options: PipelineOptions) =>
    usePipelineVersionsForPipeline(pipelineId, options),
  );
