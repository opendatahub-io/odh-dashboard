/**
 * Mock empty responses for various API endpoints
 */

export type EmptyListResponse = {
  data: unknown[];
};

export const mockEmptyList = (): EmptyListResponse => ({
  data: [],
});

export type StatusResponse = {
  data: {
    name: string;
    phase: string;
    version: string;
    distributionConfig: Record<string, unknown>;
  } | null;
};

export const mockStatus = (phase = 'NotReady'): StatusResponse => {
  if (phase === 'NotReady') {
    return { data: null };
  }

  return {
    data: {
      name: 'test-lsd',
      phase,
      version: 'v0.2.0',
      distributionConfig: {
        activeDistribution: 'ollama',
        availableDistributions: {
          ollama: 'docker.io/llamastack/distribution-ollama:latest',
        },
        providers: [],
      },
    },
  };
};
