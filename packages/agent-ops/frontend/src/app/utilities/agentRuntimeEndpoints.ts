import {
  AgentRuntime,
  AgentRuntimeDetail,
  AgentRuntimeEndpointField,
  AgentServiceEndpoint,
} from '~/app/types/agentRuntimes';
import { AgentRuntimeApiStatus } from '~/app/utilities/agentRuntimeStatus';
import {
  readSparseRuntimeStatus,
  resolveSparseServiceEndpoints,
} from '~/app/utilities/sparseApiFields';

const trimUrl = (url?: string): string => url?.trim() ?? '';

const AGENT_CARD_DISCOVERY_PATH = '/.well-known/agent-card.json';

const isHttpUrl = (url: string): boolean => /^https?:\/\//i.test(url.trim());

const buildAgentCardDiscoveryUrl = (endpoints: AgentServiceEndpoint[]): string => {
  if (!endpoints.length) {
    return '';
  }

  const httpEndpoint =
    endpoints.find((endpoint) => endpoint.name === 'http' && isHttpUrl(endpoint.url)) ??
    endpoints.find((endpoint) => endpoint.name === 'https' && isHttpUrl(endpoint.url)) ??
    endpoints.find((endpoint) => isHttpUrl(endpoint.url));

  const baseUrl = trimUrl(httpEndpoint?.url);
  if (!baseUrl) {
    return '';
  }

  return `${baseUrl.replace(/\/$/, '')}${AGENT_CARD_DISCOVERY_PATH}`;
};

export const AGENT_RUNTIME_ENDPOINT_DESCRIPTIONS = {
  clusterUrl:
    'Kubernetes cluster endpoint automatically created when the agent is deployed. Use this URL for in-cluster invocation from other workloads.',
  localUrl:
    'Endpoint for local Kind clusters during development. Available only when enabled at deploy time.',
  externalProductionEndpoint:
    'OpenShift Route exposed outside the cluster for production access. Available only when enabled at deploy time.',
} as const;

const resolveServiceEndpoints = resolveSparseServiceEndpoints;

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

  const serviceEndpoints = resolveServiceEndpoints(detail, runtime);

  const cardUrl = trimUrl(detail?.agentCard?.agentCardUrl);
  const localUrl = cardUrl || buildAgentCardDiscoveryUrl(serviceEndpoints);
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

const normalizeRuntimeStatus = readSparseRuntimeStatus;

export const getAgentRuntimeEndpointsEmptyMessage = (
  runtime: AgentRuntime,
  detail?: AgentRuntimeDetail,
): string => {
  const status = normalizeRuntimeStatus(runtime, detail);

  if (status === 'stopped' || status === 'suspended') {
    return 'This agent is stopped. Start it to restore in-cluster and external endpoints.';
  }

  if (status === 'failed') {
    return 'This agent is not healthy. Open the agent detail page to review conditions and resolve deployment issues.';
  }

  if (
    status === AgentRuntimeApiStatus.Pending ||
    status === AgentRuntimeApiStatus.Provisioning ||
    status === AgentRuntimeApiStatus.NotReady
  ) {
    return 'Endpoints appear when the agent Sandbox is Ready and the cluster Service is available. Check back shortly.';
  }

  return 'No endpoints are available for this agent yet. If the agent is Ready, confirm the Sandbox status includes a service and that you can view Services in this project.';
};
