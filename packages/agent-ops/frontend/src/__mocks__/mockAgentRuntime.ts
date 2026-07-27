import {
  AgentCardDetail,
  AgentRuntime,
  AgentRuntimeDetail,
  AgentRuntimesList,
} from '~/app/types/agentRuntimes';

export const mockAgentRuntime = (overrides?: Partial<AgentRuntime>): AgentRuntime => ({
  name: 'sample-support-agent',
  namespace: 'agent-ops-demo',
  displayName: 'Sample Support Agent',
  description: 'Customer support agent that triages tickets and drafts responses.',
  framework: 'langgraph',
  status: 'ready',
  type: 'agent',
  serviceFqdn: 'sample-support-agent.agent-ops-demo.svc.cluster.local',
  ports: [
    {
      name: 'http',
      url: 'http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080',
      port: 8080,
    },
  ],
  endpointUrl: 'http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080',
  lastSyncTime: '2026-05-12T16:00:03.214610Z',
  ...overrides,
});

export const mockAgentRuntimesList = (runtimes?: AgentRuntime[]): AgentRuntimesList => ({
  runtimes: runtimes ?? [mockAgentRuntime()],
});

/** @deprecated Post-3.5 agent card discovery mock — retained for legacy UI tests only. */
export const mockAgentCardDetail = (overrides?: Partial<AgentCardDetail>): AgentCardDetail => ({
  name: 'Sample Support Agent',
  description: 'Customer support agent that triages tickets and drafts responses.',
  version: '1.0.0',
  provider: {
    organization: 'Red Hat OpenShift AI',
    url: 'https://www.redhat.com/en/technologies/cloud-computing/openshift/ai',
  },
  agentCardUrl:
    'http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080/.well-known/agent-card.json',
  externalAgentCardUrl: 'https://sample-support-agent.apps.example.com/.well-known/agent-card.json',
  documentationUrl: 'https://docs.example.com/agents/sample-support-agent',
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['text/plain'],
  authenticationMethods: ['Bearer'],
  protocols: ['A2A', 'HTTP'],
  labels: ['Red Hat OpenShift AI', 'Sample Support Agent'],
  uuid: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  spiffeId: 'spiffe://cluster.local/ns/agent-ops-demo/sa/default',
  capabilities: {
    streaming: true,
    pushNotifications: false,
    optional: [],
  },
  skills: [
    {
      id: 'code-generation',
      name: 'Code generation',
      description:
        'Generate or refactor code from natural language prompts with repository context.',
      tags: ['development', 'code'],
      examples: [
        'Add unit tests for the auth module',
        'Refactor this handler to use dependency injection',
      ],
      inputModes: [],
      outputModes: [],
      parameters: [],
    },
    {
      id: 'repository-analysis',
      name: 'Repository analysis',
      description: 'Summarize repository structure, dependencies, and recent changes.',
      tags: ['development', 'git'],
      examples: ['What changed in the last release branch?'],
      inputModes: ['text/plain'],
      outputModes: ['text/plain'],
      parameters: [],
    },
  ],
  ...overrides,
});

export const mockAgentRuntimeDetail = (
  overrides?: Partial<AgentRuntimeDetail>,
): AgentRuntimeDetail => {
  const runtime = mockAgentRuntime(overrides?.runtime);
  const endpointUrl = typeof runtime.endpointUrl === 'string' ? runtime.endpointUrl : '';
  return {
    name: runtime.name,
    namespace: runtime.namespace,
    displayName: runtime.displayName,
    description: runtime.description,
    framework: runtime.framework,
    serviceFqdn: runtime.serviceFqdn,
    containerImage: 'quay.io/example/support-agent:latest',
    labels: {
      'openshell.ai/managed-by': 'openshell',
    },
    annotations: {
      'openshift.io/display-name': runtime.displayName,
      'openshift.io/description': runtime.description,
      'opendatahub.io/agent-framework': runtime.framework ?? 'langgraph',
    },
    runtime,
    workloadStatus: runtime.status,
    serviceEndpoints: runtime.ports.length
      ? runtime.ports
      : [
          {
            name: 'http',
            url: endpointUrl,
            port: 8080,
          },
        ],
    conditions: [
      {
        type: 'Ready',
        status: 'True',
        reason: 'SandboxReady',
        message: 'Sandbox is ready.',
        lastTransitionTime: '2026-05-12T16:00:03.214610Z',
      },
    ],
    ...overrides,
  };
};

export const mockSparseAgentRuntimeDetail = (
  overrides?: Partial<AgentRuntimeDetail>,
): AgentRuntimeDetail => {
  const runtime = mockAgentRuntime({
    status: 'pending',
    endpointUrl: '',
    ports: [],
    ...overrides?.runtime,
  });

  return {
    name: runtime.name,
    namespace: runtime.namespace,
    displayName: runtime.displayName,
    description: "Agent 'sample-support-agent' deployed from dashboard.",
    framework: runtime.framework,
    serviceFqdn: runtime.serviceFqdn,
    runtime,
    workloadStatus: runtime.status,
    serviceEndpoints: [],
    conditions: [
      {
        type: 'Ready',
        status: 'False',
        reason: 'SandboxProvisioning',
        message: 'Sandbox is provisioning.',
        lastTransitionTime: '2026-05-12T16:00:03.214610Z',
      },
    ],
    ...overrides,
  };
};
