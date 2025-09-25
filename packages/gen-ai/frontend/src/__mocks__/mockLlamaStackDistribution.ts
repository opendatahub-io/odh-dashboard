import { LlamaStackDistributionModel } from '~/app/types';

export const createMockLlamaStackDistribution = (
  phase: 'Ready' | 'Failed' | 'Pending' = 'Ready',
  health: 'healthy' | 'unhealthy' = 'healthy',
): LlamaStackDistributionModel => {
  const isHealthy = health === 'healthy';
  const isReady = phase === 'Ready';

  return {
    name: isReady ? 'test-distribution' : 'error-distribution',
    phase,
    version: '1.0.0',
    distributionConfig: {
      activeDistribution: 'meta-llama3',
      providers: [
        {
          providerID: 'meta-reference',
          providerType: 'inference',
          api: 'inference',
          health: {
            status: isHealthy ? 'healthy' : 'unhealthy',
            message: isHealthy ? 'Provider is running normally' : 'Provider failed to start',
          },
        },
        ...(isHealthy
          ? [
              {
                providerID: 'test',
                providerType: 'embedding' as const,
                api: 'embeddings' as const,
                config: null,
                health: {
                  status: 'healthy' as const,
                  message: 'Provider is running normally',
                },
              },
            ]
          : []),
      ],
      availableDistributions: {
        'meta-llama3': 'Meta Llama 3 Distribution',
        ...(isHealthy ? { 'meta-llama2': 'Meta Llama 2 Distribution' } : {}),
      },
    },
  };
};

// Backward compatibility - keep the original exports
export const mockLlamaStackDistribution: LlamaStackDistributionModel =
  createMockLlamaStackDistribution('Ready', 'healthy');

export const mockLlamaStackDistributionError: LlamaStackDistributionModel =
  createMockLlamaStackDistribution('Failed', 'unhealthy');
