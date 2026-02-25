import type { PipelineDefinition, PipelineRun } from '~/app/types';
import {
  getMockPipelineDefinitions,
  getMockPipelineRuns,
  deleteMockPipelineRun,
} from '~/app/api/pipelinesMock';

export async function getPipelineDefinitions(
  useMock: boolean,
  _hostPath: string,
  namespace: string,
): Promise<PipelineDefinition[]> {
  if (useMock) {
    return getMockPipelineDefinitions(namespace);
  }
  // BFF pipeline-definitions endpoint not yet implemented; return empty when using real BFF
  return [];
}

export async function getPipelineRuns(
  useMock: boolean,
  _hostPath: string,
  namespace: string,
  pipelineIds: string[],
): Promise<PipelineRun[]> {
  if (useMock) {
    return getMockPipelineRuns(namespace, pipelineIds);
  }
  // BFF pipeline-runs endpoint not yet implemented; return empty when using real BFF
  return [];
}

export async function deletePipelineRun(
  useMock: boolean,
  _hostPath: string,
  namespace: string,
  runId: string,
): Promise<void> {
  if (useMock) {
    return deleteMockPipelineRun(namespace, runId);
  }
  // TODO: Replace with real BFF call when available
  return deleteMockPipelineRun(namespace, runId);
}
