import { usePipelineRunQuery as useCorePipelineRunQuery } from '@odh-dashboard/autox-core/ui/hooks';
import type { PipelineRun } from '@odh-dashboard/autox-core/ui/api';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import { normalizePipelineRun } from '~/app/utilities/pipelineRunUtils';

export const usePipelineRunQuery = (
  runId?: string,
  namespace?: string,
): UseQueryResult<PipelineRun<ConfigureSchema>, Error> =>
  useCorePipelineRunQuery<ConfigureSchema, PipelineRun<ConfigureSchema>>(
    runId,
    namespace,
    normalizePipelineRun,
  );
