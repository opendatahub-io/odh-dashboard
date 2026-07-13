/* eslint-disable camelcase */
import type { Agent, AgentList } from '~/app/agentsCatalogTypes';
import type { AgentsCatalogFilterOptionsList } from '~/app/pages/agentsCatalog/types/agentsCatalogFilterOptions';

export const mockAgent = (partial?: Partial<Agent>): Agent => ({
  id: '1',
  name: 'research-assistant',
  displayName: 'Research Assistant',
  description: 'An agent that performs research tasks using web search and summarization.',
  framework: 'LangGraph',
  source_id: 'sample',
  labels: ['research', 'summarization'],
  logo: undefined,
  repositoryUrl: 'https://github.com/example/research-assistant',
  env: [{ name: 'OPENAI_API_KEY', required: true, description: 'API key for the LLM provider' }],
  artifacts: [{ uri: 'ghcr.io/example/research-assistant:latest' }],
  readme: '# Research Assistant\n\n### Overview\n\nAn agent for automated research.',
  ...partial,
});

export const mockAgentList = (partial?: Partial<AgentList>): AgentList => ({
  items: [mockAgent()],
  pageSize: 10,
  size: 1,
  nextPageToken: '',
  ...partial,
});

export const mockAgentsCatalogFilterOptions = (
  partial?: Partial<AgentsCatalogFilterOptionsList>,
): AgentsCatalogFilterOptionsList => ({
  filters: {
    framework: { type: 'string', values: ['LangGraph', 'CrewAI', 'AutoGen'] },
    category: { type: 'string', values: ['General purpose', 'Multi-agent', 'Tool use'] },
    communicationProtocol: { type: 'string', values: ['A2A', 'MCP', 'Custom'] },
    testedModels: {
      type: 'string',
      values: ['OpenAI-compatible endpoint', 'Anthropic-compatible endpoint'],
    },
  },
  ...partial,
});
