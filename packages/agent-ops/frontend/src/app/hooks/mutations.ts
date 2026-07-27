import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import type { APIOptions } from 'mod-arch-core';
import { deleteAgent, restartAgent, startAgent, stopAgent } from '~/app/api/agentLifecycle';
import { deployAgent } from '~/app/api/deployAgent';
import type { AgentLifecycleParams, LifecycleResult } from '~/app/types/agentLifecycle';
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

export function useStopAgentMutation(
  namespace: string,
  name: string,
  hostPath = '',
): UseMutationResult<LifecycleResult, Error, AgentLifecycleParams> {
  return useMutation({
    mutationKey: ['agent-ops', 'stopAgent', namespace, name],
    mutationFn: async (params: AgentLifecycleParams) => {
      const apiOpts: APIOptions = {};
      return stopAgent(hostPath)(apiOpts, params);
    },
    retry: false,
  });
}

export function useStartAgentMutation(
  namespace: string,
  name: string,
  hostPath = '',
): UseMutationResult<LifecycleResult, Error, AgentLifecycleParams> {
  return useMutation({
    mutationKey: ['agent-ops', 'startAgent', namespace, name],
    mutationFn: async (params: AgentLifecycleParams) => {
      const apiOpts: APIOptions = {};
      return startAgent(hostPath)(apiOpts, params);
    },
    retry: false,
  });
}

export function useRestartAgentMutation(
  namespace: string,
  name: string,
  hostPath = '',
): UseMutationResult<LifecycleResult, Error, AgentLifecycleParams> {
  return useMutation({
    mutationKey: ['agent-ops', 'restartAgent', namespace, name],
    mutationFn: async (params: AgentLifecycleParams) => {
      const apiOpts: APIOptions = {};
      return restartAgent(hostPath)(apiOpts, params);
    },
    retry: false,
  });
}

export function useDeleteAgentMutation(
  namespace: string,
  name: string,
  hostPath = '',
): UseMutationResult<void, Error, AgentLifecycleParams> {
  return useMutation({
    mutationKey: ['agent-ops', 'deleteAgent', namespace, name],
    mutationFn: async (params: AgentLifecycleParams) => {
      const apiOpts: APIOptions = {};
      return deleteAgent(hostPath)(apiOpts, params);
    },
    retry: false,
  });
}
