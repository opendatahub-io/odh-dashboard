import {
  AgentRuntime,
  AgentRuntimeDetail,
  AgentRuntimeEndpointField,
} from '~/app/types/agentRuntimes';

const trimUrl = (url?: string): string => url?.trim() ?? '';

export const AGENT_RUNTIME_ENDPOINT_DESCRIPTIONS = {
  clusterUrl:
    'Kubernetes cluster endpoint automatically created when the agent is deployed. Use this URL for in-cluster invocation from other workloads.',
  localUrl:
    'Endpoint for local Kind clusters during development. Available only when enabled at deploy time.',
  externalProductionEndpoint:
    'OpenShift Route exposed outside the cluster for production access. Available only when enabled at deploy time.',
} as const;

export const getAgentRuntimeEndpointFields = (
  runtime?: AgentRuntime,
  detail?: AgentRuntimeDetail,
): AgentRuntimeEndpointField[] => {
  const fields: AgentRuntimeEndpointField[] = [];

  const detailRuntime = detail?.runtime;
  const clusterUrl = trimUrl(
    (detailRuntime && 'endpointUrl' in detailRuntime ? detailRuntime.endpointUrl : undefined) ??
      runtime?.endpointUrl,
  );
  if (clusterUrl) {
    fields.push({
      id: 'cluster-url',
      label: 'Cluster URL',
      description: AGENT_RUNTIME_ENDPOINT_DESCRIPTIONS.clusterUrl,
      url: clusterUrl,
    });
  }

  const localUrl = trimUrl(detail?.agentCard?.agentCardUrl);
  if (localUrl) {
    fields.push({
      id: 'local-url',
      label: 'Local URL',
      description: AGENT_RUNTIME_ENDPOINT_DESCRIPTIONS.localUrl,
      url: localUrl,
    });
  }

  const externalUrl = trimUrl(detail?.agentCard?.externalAgentCardUrl);
  if (externalUrl) {
    fields.push({
      id: 'external-production-endpoint',
      label: 'External production endpoint',
      description: AGENT_RUNTIME_ENDPOINT_DESCRIPTIONS.externalProductionEndpoint,
      url: externalUrl,
    });
  }

  return fields;
};
