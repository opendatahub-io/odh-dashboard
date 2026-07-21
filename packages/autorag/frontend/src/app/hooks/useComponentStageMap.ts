import { useQuery } from '@tanstack/react-query';
import * as z from 'zod';
import { useS3ListFilesQuery, fetchS3Json } from '~/app/hooks/queries';
import { useAutoragOutputDir } from '~/app/hooks/useAutoragOutputDir';
import type { PipelineRun } from '~/app/types';

/* eslint-disable camelcase */
const ComponentStageMapStageSchema = z
  .object({
    id: z.string(),
    description: z.string(),
    steps: z.array(z.string()).optional(),
    status: z.string().optional(),
    timestamp: z.string().optional(),
  })
  .catchall(z.unknown());

const ComponentStageMapComponentSchema = z
  .object({
    id: z.string(),
    description: z.string(),
    stages: z.array(ComponentStageMapStageSchema),
    started_at: z.string().optional(),
    completed_at: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .catchall(z.unknown());

export const ComponentStageMapSchema = z
  .object({
    pipeline_id: z.string(),
    description: z.string(),
    components: z.array(ComponentStageMapComponentSchema),
    kfp_run_id: z.string(),
    published_at: z.string(),
  })
  .catchall(z.unknown());

export type ComponentStageMapStage = z.infer<typeof ComponentStageMapStageSchema>;
export type ComponentStageMapComponent = z.infer<typeof ComponentStageMapComponentSchema>;
export type ComponentStageMap = z.infer<typeof ComponentStageMapSchema>;
/* eslint-enable camelcase */

type UseComponentStageMapReturn = {
  componentStageMap?: ComponentStageMap;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
};

const TASK_ID = 'publish-component-stage-map';

export function isTaskSucceeded(pipelineRun?: PipelineRun): boolean {
  const task = pipelineRun?.run_details?.task_details?.find(
    (td) => td.display_name === TASK_ID || td.task_id === TASK_ID,
  );
  return task?.state === 'SUCCEEDED';
}

export function useComponentStageMap(
  runId?: string,
  namespace?: string,
  pipelineRun?: PipelineRun,
): UseComponentStageMapReturn {
  const { rootDir } = useAutoragOutputDir(pipelineRun);

  const taskSucceeded = isTaskSucceeded(pipelineRun);

  const s3Prefix = taskSucceeded && runId ? `${rootDir}/${runId}/${TASK_ID}` : undefined;

  const {
    data: s3Files,
    isLoading: isS3Loading,
    isError: isS3Error,
  } = useS3ListFilesQuery(namespace, s3Prefix);

  // Discover the nondeterministic ID directory
  const stageMapJsonPath = (() => {
    const prefixes = s3Files?.common_prefixes ?? [];
    if (prefixes.length === 0) {
      return undefined;
    }
    const prefix = prefixes[0]?.prefix;
    if (!prefix) {
      return undefined;
    }
    return `${prefix}component_stage_map/component_stage_map.json`;
  })();

  const {
    data: componentStageMap,
    isLoading: isJsonLoading,
    isError: isJsonError,
    error: jsonError,
  } = useQuery<ComponentStageMap>({
    queryKey: ['autorag', 'componentStageMap', namespace, stageMapJsonPath],
    queryFn: async ({ signal }) => {
      if (!namespace || !stageMapJsonPath) {
        throw new Error('namespace and path are required');
      }
      return fetchS3Json(namespace, stageMapJsonPath, {
        signal,
        schema: ComponentStageMapSchema,
      });
    },
    enabled: Boolean(namespace && stageMapJsonPath),
    retry: false,
  });

  const isLoading = (taskSucceeded && isS3Loading) || isJsonLoading;
  const isError = isS3Error || isJsonError;
  const error = isError
    ? isS3Error
      ? new Error('Failed to list component stage map directory')
      : jsonError instanceof Error
        ? jsonError
        : undefined
    : undefined;

  return { componentStageMap, isLoading, isError, error };
}
