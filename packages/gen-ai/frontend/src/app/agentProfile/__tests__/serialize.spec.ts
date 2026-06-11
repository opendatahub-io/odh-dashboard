/* eslint-disable camelcase */
import { DEFAULT_CONFIGURATION } from '~/app/Chatbot/store/types';
import { AIModel } from '~/app/types';
import { MCPServerFromAPI } from '~/app/types/mcp';
import {
  AgentProfileSerializationContext,
  serializeToAgentProfileSpec,
} from '~/app/agentProfile/serialize';

const makeModel = (overrides: Partial<AIModel> = {}): AIModel => ({
  model_name: 'llama-3-70b',
  model_id: 'ai-asset-llama-3-70b',
  serving_runtime: 'vllm',
  api_protocol: 'openai',
  version: '1',
  usecase: '',
  description: '',
  endpoints: ['http://llama.svc/v1'],
  status: 'Running',
  display_name: 'Llama 3 70B',
  sa_token: { name: '', token_name: '', token: '' },
  model_source_type: 'namespace',
  internalEndpoint: 'http://llama.svc/v1',
  externalEndpoint: undefined,
  ...overrides,
});

const makeMcpServer = (overrides: Partial<MCPServerFromAPI> = {}): MCPServerFromAPI => ({
  name: 'weather-server',
  url: 'http://weather-mcp.svc/sse',
  transport: 'sse',
  description: 'Weather data server',
  logo: null,
  status: 'healthy',
  ...overrides,
});

const makeContext = (
  overrides: Partial<AgentProfileSerializationContext> = {},
): AgentProfileSerializationContext => ({
  model: makeModel(),
  mcpServers: [],
  mcpConfigMapName: undefined,
  ...overrides,
});

describe('serializeToAgentProfileSpec', () => {
  describe('model field', () => {
    it('should use the AI Asset model_id (not the Llama Stack selectedModel)', () => {
      const config = { ...DEFAULT_CONFIGURATION, selectedModel: 'llama-3.1-8b-instruct' };
      const result = serializeToAgentProfileSpec(config, 'My Agent', undefined, makeContext());

      expect(result.model.id).toBe('ai-asset-llama-3-70b'); // model_id from AIModel, not selectedModel
      expect(result.model.uri).toBe('http://llama.svc/v1');
      expect(result.model.sourceType).toBe('namespace');
    });

    it('should use externalEndpoint when no internalEndpoint', () => {
      const model = makeModel({
        internalEndpoint: undefined,
        externalEndpoint: 'https://api.example.com',
      });
      const config = { ...DEFAULT_CONFIGURATION, selectedModel: 'llama-3-70b' };
      const result = serializeToAgentProfileSpec(
        config,
        'My Agent',
        undefined,
        makeContext({ model }),
      );

      expect(result.model.uri).toBe('https://api.example.com');
    });

    it('should include maasSubscription in authorization when selectedSubscription is set', () => {
      const config = {
        ...DEFAULT_CONFIGURATION,
        selectedModel: 'granite-3b',
        selectedSubscription: 'sub-123',
      };
      const result = serializeToAgentProfileSpec(config, 'My Agent', undefined, makeContext());

      expect(result.model.authorization?.maasSubscription).toBe('sub-123');
    });

    it('should omit authorization when no subscription', () => {
      const config = { ...DEFAULT_CONFIGURATION, selectedSubscription: '' };
      const result = serializeToAgentProfileSpec(config, 'My Agent', undefined, makeContext());

      expect(result.model.authorization).toBeUndefined();
    });

    it('should fall back to selectedModel when model context is undefined', () => {
      const config = { ...DEFAULT_CONFIGURATION, selectedModel: 'llama-3.1-8b-instruct' };
      const result = serializeToAgentProfileSpec(
        config,
        'My Agent',
        undefined,
        makeContext({ model: undefined }),
      );

      expect(result.model.id).toBe('llama-3.1-8b-instruct');
      expect(result.model.uri).toBe('');
    });
  });

  describe('inference params', () => {
    it('should map temperature and stream', () => {
      const config = { ...DEFAULT_CONFIGURATION, temperature: 0.8, isStreamingEnabled: false };
      const result = serializeToAgentProfileSpec(config, 'My Agent', undefined, makeContext());

      expect(result.temperature).toBe(0.8);
      expect(result.stream).toBe(false);
    });
  });

  describe('displayName and description', () => {
    it('should include displayName and description', () => {
      const result = serializeToAgentProfileSpec(
        DEFAULT_CONFIGURATION,
        'Customer Support Agent',
        'Handles tier-1 queries',
        makeContext(),
      );

      expect(result.displayName).toBe('Customer Support Agent');
      expect(result.description).toBe('Handles tier-1 queries');
    });

    it('should omit description when empty string', () => {
      const result = serializeToAgentProfileSpec(
        DEFAULT_CONFIGURATION,
        'My Agent',
        '',
        makeContext(),
      );

      expect(result.description).toBeUndefined();
    });
  });

  describe('prompt field', () => {
    it('should serialize activePrompt as MLflow reference', () => {
      const config = {
        ...DEFAULT_CONFIGURATION,
        activePrompt: {
          name: 'customer-support-v2',
          version: 3,
          template: 'You are a support agent.',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      };
      const result = serializeToAgentProfileSpec(config, 'My Agent', undefined, makeContext());

      expect(result.prompt).toEqual({
        name: 'customer-support-v2',
        source: 'mlflow',
        version: '3',
        variables: undefined,
      });
    });

    it('should include variable values in prompt', () => {
      const config = {
        ...DEFAULT_CONFIGURATION,
        activePrompt: {
          name: 'my-prompt',
          version: 1,
          created_at: '',
          updated_at: '',
        },
        variableValues: { company_name: 'Acme Corp', tone: 'professional' },
      };
      const result = serializeToAgentProfileSpec(config, 'My Agent', undefined, makeContext());

      expect(result.prompt?.variables).toEqual({
        company_name: { text: 'Acme Corp', type: 'string' },
        tone: { text: 'professional', type: 'string' },
      });
    });

    it('should omit prompt when no activePrompt', () => {
      const config = { ...DEFAULT_CONFIGURATION, activePrompt: null };
      const result = serializeToAgentProfileSpec(config, 'My Agent', undefined, makeContext());

      expect(result.prompt).toBeUndefined();
    });
  });

  describe('vectorStores field', () => {
    it('should serialize external RAG vector store as storeRef', () => {
      const config = {
        ...DEFAULT_CONFIGURATION,
        isRagEnabled: true,
        knowledgeMode: 'external' as const,
        selectedVectorStoreId: 'vs-abc123',
      };
      const result = serializeToAgentProfileSpec(config, 'My Agent', undefined, makeContext());

      expect(result.vectorStores).toEqual({
        stores: [
          { storeRef: { kind: 'ConfigMap', name: 'gen-ai-aa-vector-stores', key: 'vs-abc123' } },
        ],
      });
    });

    it('should serialize inline RAG vector store as direct id', () => {
      const config = {
        ...DEFAULT_CONFIGURATION,
        isRagEnabled: true,
        knowledgeMode: 'inline' as const,
        selectedVectorStoreId: 'vs_203e7612-0bb8-41db-89f1-18f054985139',
      };
      const result = serializeToAgentProfileSpec(config, 'My Agent', undefined, makeContext());

      expect(result.vectorStores).toEqual({
        stores: [{ id: 'vs_203e7612-0bb8-41db-89f1-18f054985139' }],
      });
    });

    it('should omit vectorStores when RAG is disabled', () => {
      const config = {
        ...DEFAULT_CONFIGURATION,
        isRagEnabled: false,
        selectedVectorStoreId: 'vs-abc123',
      };
      const result = serializeToAgentProfileSpec(config, 'My Agent', undefined, makeContext());

      expect(result.vectorStores).toBeUndefined();
    });

    it('should omit vectorStores when no vector store is selected in inline mode', () => {
      const config = {
        ...DEFAULT_CONFIGURATION,
        isRagEnabled: true,
        knowledgeMode: 'inline' as const,
        selectedVectorStoreId: null,
      };
      const result = serializeToAgentProfileSpec(config, 'My Agent', undefined, makeContext());

      expect(result.vectorStores).toBeUndefined();
    });

    it('should omit vectorStores when no vector store is selected', () => {
      const config = {
        ...DEFAULT_CONFIGURATION,
        isRagEnabled: true,
        knowledgeMode: 'external' as const,
        selectedVectorStoreId: null,
      };
      const result = serializeToAgentProfileSpec(config, 'My Agent', undefined, makeContext());

      expect(result.vectorStores).toBeUndefined();
    });
  });

  describe('mcpServers field', () => {
    it('should serialize selected MCP servers with ConfigMap ref', () => {
      const server = makeMcpServer();
      const config = {
        ...DEFAULT_CONFIGURATION,
        selectedMcpServerIds: ['weather-server'],
        mcpToolSelections: {},
      };
      const result = serializeToAgentProfileSpec(
        config,
        'My Agent',
        undefined,
        makeContext({ mcpServers: [server], mcpConfigMapName: 'mcp-servers-config' }),
      );

      expect(result.mcpServers).toEqual([
        {
          serverRef: { kind: 'ConfigMap', name: 'mcp-servers-config', key: 'weather-server' },
          allowedTools: undefined,
        },
      ]);
    });

    it('should include allowedTools from mcpToolSelections', () => {
      const server = makeMcpServer();
      const config = {
        ...DEFAULT_CONFIGURATION,
        selectedMcpServerIds: ['weather-server'],
        mcpToolSelections: {
          'default-ns': { 'http://weather-mcp.svc/sse': ['get_forecast', 'get_alerts'] },
        },
      };
      const result = serializeToAgentProfileSpec(
        config,
        'My Agent',
        undefined,
        makeContext({ mcpServers: [server], mcpConfigMapName: 'mcp-servers-config' }),
      );

      expect(result.mcpServers?.[0].allowedTools).toEqual(['get_forecast', 'get_alerts']);
    });

    it('should omit mcpServers when none selected', () => {
      const result = serializeToAgentProfileSpec(
        DEFAULT_CONFIGURATION,
        'My Agent',
        undefined,
        makeContext({ mcpServers: [makeMcpServer()], mcpConfigMapName: 'mcp-config' }),
      );

      expect(result.mcpServers).toBeUndefined();
    });

    it('should omit mcpServers when mcpConfigMapName is not provided', () => {
      const config = {
        ...DEFAULT_CONFIGURATION,
        selectedMcpServerIds: ['weather-server'],
      };
      const result = serializeToAgentProfileSpec(
        config,
        'My Agent',
        undefined,
        makeContext({ mcpServers: [makeMcpServer()], mcpConfigMapName: undefined }),
      );

      expect(result.mcpServers).toBeUndefined();
    });

    it('should skip servers not found in available server list', () => {
      const config = {
        ...DEFAULT_CONFIGURATION,
        selectedMcpServerIds: ['unknown-server'],
      };
      const result = serializeToAgentProfileSpec(
        config,
        'My Agent',
        undefined,
        makeContext({ mcpServers: [makeMcpServer()], mcpConfigMapName: 'mcp-config' }),
      );

      expect(result.mcpServers).toBeUndefined();
    });
  });

  describe('guardrails field', () => {
    it('should never serialize guardrails (unsupported mapping)', () => {
      const config = {
        ...DEFAULT_CONFIGURATION,
        guardrail: 'nvidia-guardian-8b',
        guardrailUserInputEnabled: true,
        guardrailModelOutputEnabled: true,
      };
      const result = serializeToAgentProfileSpec(config, 'My Agent', undefined, makeContext());

      expect(result.guardrails).toBeUndefined();
    });
  });
});
