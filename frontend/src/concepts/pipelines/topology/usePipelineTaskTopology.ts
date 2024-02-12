import { KubeFlowTaskTopology } from '~/concepts/pipelines/content/types';

const EMPTY_STATE: KubeFlowTaskTopology = { taskMap: {}, nodes: [] };

export const usePipelineTaskTopology = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pipelineRun: unknown,
): KubeFlowTaskTopology => EMPTY_STATE;
