import { AgentCard } from '~/app/types/agentCard';

export const mockAgentCard = (overrides?: Partial<AgentCard>): AgentCard => ({
  name: 'sample-support-agent',
  namespace: 'agent-ops-demo',
  description: 'Customer support agent that triages tickets and drafts responses.',
  version: '1.2.0',
  skills: [
    {
      id: 'ticket-triage',
      name: 'Ticket triage',
      description: 'Classifies incoming support tickets by priority and topic.',
    },
    {
      id: 'response-draft',
      name: 'Response drafting',
      description: 'Drafts customer-facing replies from ticket context and knowledge base snippets.',
    },
  ],
  capabilities: {
    streaming: true,
    pushNotifications: false,
  },
  provider: {
    name: 'opendatahub',
    displayName: 'Open Data Hub',
    url: 'https://opendatahub.io',
  },
  supportedInputModes: ['text/plain', 'application/json'],
  supportedOutputModes: ['text/plain', 'application/json'],
  ...overrides,
});
