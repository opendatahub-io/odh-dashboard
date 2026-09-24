import { usePipelineRunQuery as useCorePipelineRunQuery } from '@odh-dashboard/autox-core/ui/hooks';
import type { PipelineRun } from '@odh-dashboard/autox-core/ui/api';
import type { UseQueryResult } from '@tanstack/react-query';
import type { AutoragRuntimeParameters } from '~/app/types';
import { normalizePipelineRun } from '~/app/utilities/pipelineRunUtils';

export const usePipelineRunQuery = (
  runId?: string,
  namespace?: string,
): UseQueryResult<PipelineRun<AutoragRuntimeParameters>, Error> =>
  useCorePipelineRunQuery<AutoragRuntimeParameters, PipelineRun<AutoragRuntimeParameters>>(
    runId,
    namespace,
    normalizePipelineRun,
  );
