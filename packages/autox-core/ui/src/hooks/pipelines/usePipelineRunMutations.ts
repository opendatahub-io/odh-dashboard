import { useMutation, UseMutationResult } from '@tanstack/react-query';

export type PipelineRunMutations = {
  useTerminatePipelineRunMutation: (
    namespace: string,
    runId: string,
  ) => UseMutationResult<void, Error, void, unknown>;
  useRetryPipelineRunMutation: (
    namespace: string,
    runId: string,
  ) => UseMutationResult<void, Error, void, unknown>;
  useDeletePipelineRunMutation: (
    namespace: string,
    runId: string,
  ) => UseMutationResult<void, Error, void, unknown>;
};

/**
 * Creates the shared terminate/retry/delete pipeline-run mutation hooks for a
 * given product's BFF URL prefix/API version.
 */
export function createPipelineRunMutations(
  urlPrefix: string,
  bffApiVersion: string,
): PipelineRunMutations {
  async function postPipelineRunAction(url: string, action: string): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      const body = await response.text();
      let serverMessage = body;
      try {
        const json = JSON.parse(body);
        serverMessage = json.error?.message || json.message || body;
      } catch {
        // body is not JSON, use as-is
      }
      throw new Error(`Failed to ${action} run (${response.status}): ${serverMessage}`);
    }
  }

  function useTerminatePipelineRunMutation(
    namespace: string,
    runId: string,
  ): UseMutationResult<void, Error, void, unknown> {
    return useMutation({
      mutationKey: ['terminatePipelineRun', runId],
      mutationFn: () => {
        const url = `${urlPrefix}/api/${bffApiVersion}/pipeline-runs/${encodeURIComponent(
          runId,
        )}/terminate?namespace=${encodeURIComponent(namespace)}`;
        return postPipelineRunAction(url, 'terminate');
      },
    });
  }

  function useRetryPipelineRunMutation(
    namespace: string,
    runId: string,
  ): UseMutationResult<void, Error, void, unknown> {
    return useMutation({
      mutationKey: ['retryPipelineRun', runId],
      mutationFn: () => {
        const url = `${urlPrefix}/api/${bffApiVersion}/pipeline-runs/${encodeURIComponent(
          runId,
        )}/retry?namespace=${encodeURIComponent(namespace)}`;
        return postPipelineRunAction(url, 'retry');
      },
    });
  }

  function useDeletePipelineRunMutation(
    namespace: string,
    runId: string,
  ): UseMutationResult<void, Error, void, unknown> {
    return useMutation({
      mutationKey: ['deletePipelineRun', runId],
      mutationFn: async () => {
        const url = `${urlPrefix}/api/${bffApiVersion}/pipeline-runs/${encodeURIComponent(
          runId,
        )}?namespace=${encodeURIComponent(namespace)}`;
        const response = await fetch(url, { method: 'DELETE' });
        if (!response.ok) {
          const body = await response.text();
          let serverMessage = body;
          try {
            const json = JSON.parse(body);
            serverMessage = json.error?.message || json.message || body;
          } catch {
            // body is not JSON, use as-is
          }
          throw new Error(`Failed to delete run (${response.status}): ${serverMessage}`);
        }
      },
    });
  }

  return {
    useTerminatePipelineRunMutation,
    useRetryPipelineRunMutation,
    useDeletePipelineRunMutation,
  };
}
