import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import type { APIOptions } from 'mod-arch-core';
import { deployAgent } from '~/app/api/deployAgent';
import type { DeployAgentRequest, DeployAgentResponse } from '~/app/types/deployAgent';

/**
 * React Query mutation for POST /api/v1/agents/deploy.
 * Uses hostPath '' for same-origin requests by default.
 */
export function useDeployAgentMutation(
  hostPath = '',
): UseMutationResult<DeployAgentResponse, Error, DeployAgentRequest> {
  return useMutation({
    mutationKey: ['agent-ops', 'deployAgent'],
    mutationFn: async (request: DeployAgentRequest) => {
      const apiOpts: APIOptions = {};
      return deployAgent(hostPath)(apiOpts, request);
    },
    // POST deploy must not auto-retry (default is false; explicit for clarity).
    retry: false,
  });
}
