/**
 * Placeholder hook for pipeline definitions. AutoML BFF does not yet expose
 * pipeline-definitions; returns empty list immediately for loading coordination.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- namespace kept for API consistency with Autorag; BFF pipeline-definitions not yet implemented
export function usePipelineDefinitions(namespace: string): {
  loaded: boolean;
  error: Error | undefined;
} {
  return {
    loaded: true,
    error: undefined,
  };
}
