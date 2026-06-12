/* eslint-disable camelcase */
/**
 * Round-trip tests: serialize → deserialize → settings match.
 * Covers the acceptance criterion: "serialize → deserialize → all settings match"
 */
import { ChatbotConfiguration, DEFAULT_CONFIGURATION } from '~/app/Chatbot/store/types';
import { AIModel, LlamaModel } from '~/app/types';
import { MCPServerFromAPI } from '~/app/types/mcp';
import {
  AgentProfileDeserializationContext,
  deserializeAgentProfile,
} from '~/app/agentProfile/deserialize';
import {
  serializeToAgentProfileSpec,
  AgentProfileSerializationContext,
} from '~/app/agentProfile/serialize';
import { AgentProfile } from '~/app/agentProfile/types';

const FAKE_RESOURCE_VERSION = '42';

const wrapSpec = (spec: ReturnType<typeof serializeToAgentProfileSpec>): AgentProfile => ({
  apiVersion: 'genai.redhat.com/v1alpha1',
  kind: 'AgentProfile',
  metadata: { name: 'test-uuid', resourceVersion: FAKE_RESOURCE_VERSION },
  spec,
});

const makeModel = (overrides: Partial<AIModel> = {}): AIModel => ({
  model_name: 'llama-3-70b',
  model_id: 'ai-asset-llama-3-70b', // AI Asset catalog ID written to spec.model.id
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
  description: '',
  logo: null,
  status: 'healthy',
  ...overrides,
});

const makeLlamaModel = (modelId: string, llamaId: string): LlamaModel => ({
  id: llamaId,
  modelId,
  object: 'model',
  created: 0,
  owned_by: '',
});

const roundTrip = (
  config: ChatbotConfiguration,
  displayName: string,
  serializeCtx: AgentProfileSerializationContext,
  deserializeCtx?: AgentProfileDeserializationContext,
) => {
  const spec = serializeToAgentProfileSpec(
    config,
    displayName,
    config.systemInstruction || undefined,
    serializeCtx,
  );
  const profile = wrapSpec(spec);
  return deserializeAgentProfile(profile, deserializeCtx ?? { playgroundModels: [] });
};

describe('serialize → deserialize round-trip', () => {
  it('should resolve model back to Llama Stack runtime ID via playgroundModels', () => {
    const llamaModel = makeLlamaModel('ai-asset-llama-3-70b', 'vllm-inference-1/llama-3-70b');
    const config: ChatbotConfiguration = {
      ...DEFAULT_CONFIGURATION,
      selectedModel: 'vllm-inference-1/llama-3-70b',
      temperature: 0.8,
      isStreamingEnabled: false,
    };
    const { config: restored } = roundTrip(
      config,
      'Test',
      { model: makeModel(), mcpServers: [] },
      { playgroundModels: [llamaModel] },
    );

    expect(restored.selectedModel).toBe('vllm-inference-1/llama-3-70b');
    expect(restored.temperature).toBe(0.8);
    expect(restored.isStreamingEnabled).toBe(false);
  });

  it('should restore MaaS subscription', () => {
    const config: ChatbotConfiguration = {
      ...DEFAULT_CONFIGURATION,
      selectedModel: 'granite-3b',
      selectedSubscription: 'sub-abc',
    };
    const { config: restored } = roundTrip(config, 'Test', {
      model: makeModel({ model_source_type: 'maas' }),
      mcpServers: [],
    });

    expect(restored.selectedSubscription).toBe('sub-abc');
  });

  it('should restore external RAG vector store via storeRef round-trip', () => {
    const config: ChatbotConfiguration = {
      ...DEFAULT_CONFIGURATION,
      isRagEnabled: true,
      knowledgeMode: 'external',
      selectedVectorStoreId: 'vs-xyz',
    };
    const { config: restored } = roundTrip(config, 'Test', { model: makeModel(), mcpServers: [] });

    expect(restored.isRagEnabled).toBe(true);
    expect(restored.knowledgeMode).toBe('external');
    expect(restored.selectedVectorStoreId).toBe('vs-xyz'); // restored from storeRef.key
  });

  it('should restore inline RAG vector store via id round-trip', () => {
    const config: ChatbotConfiguration = {
      ...DEFAULT_CONFIGURATION,
      isRagEnabled: true,
      knowledgeMode: 'inline',
      selectedVectorStoreId: 'vs_203e7612-0bb8-41db-89f1-18f054985139',
    };
    const { config: restored } = roundTrip(config, 'Test', { model: makeModel(), mcpServers: [] });

    expect(restored.isRagEnabled).toBe(true);
    expect(restored.knowledgeMode).toBe('inline');
    expect(restored.selectedVectorStoreId).toBe('vs_203e7612-0bb8-41db-89f1-18f054985139');
  });

  it('should restore disabled RAG state', () => {
    const config: ChatbotConfiguration = {
      ...DEFAULT_CONFIGURATION,
      isRagEnabled: false,
      selectedVectorStoreId: null,
    };
    const { config: restored } = roundTrip(config, 'Test', { model: makeModel(), mcpServers: [] });

    expect(restored.isRagEnabled).toBe(false);
    expect(restored.selectedVectorStoreId).toBeNull();
  });

  it('should restore selected MCP servers and pending tool selections', () => {
    const server = makeMcpServer();
    const config: ChatbotConfiguration = {
      ...DEFAULT_CONFIGURATION,
      selectedMcpServerIds: ['weather-server'],
      mcpToolSelections: {
        'default-ns': { 'http://weather-mcp.svc/sse': ['get_forecast', 'get_alerts'] },
      },
    };
    const { config: restored, mcpToolsPending } = roundTrip(config, 'Test', {
      model: makeModel(),
      mcpServers: [server],
      mcpConfigMapName: 'mcp-servers-config',
    });

    expect(restored.selectedMcpServerIds).toEqual(['weather-server']);
    expect(mcpToolsPending).toEqual({ 'weather-server': ['get_forecast', 'get_alerts'] });
  });

  it('should always produce cleared guardrail state (unsupported mapping)', () => {
    const config: ChatbotConfiguration = {
      ...DEFAULT_CONFIGURATION,
      guardrail: 'nvidia-guardian-8b',
      guardrailUserInputEnabled: true,
      guardrailModelOutputEnabled: true,
    };
    const { config: restored } = roundTrip(config, 'Test', { model: makeModel(), mcpServers: [] });

    expect(restored.guardrail).toBe('');
    expect(restored.guardrailUserInputEnabled).toBe(false);
    expect(restored.guardrailModelOutputEnabled).toBe(false);
  });

  it('should restore prompt ref with version and variable values', () => {
    const config: ChatbotConfiguration = {
      ...DEFAULT_CONFIGURATION,
      activePrompt: {
        name: 'support-agent-v2',
        version: 5,
        template: 'You are a support agent.',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
      variableValues: { company: 'Acme', tone: 'professional' },
    };
    const { config: restored, promptRef } = roundTrip(config, 'Test', {
      model: makeModel(),
      mcpServers: [],
    });

    expect(promptRef).toEqual({ name: 'support-agent-v2', version: 5, source: 'mlflow' });
    expect(restored.variableValues).toEqual({ company: 'Acme', tone: 'professional' });
    expect(restored.activePrompt).toBeNull(); // requires async load
  });

  it('should produce empty MCP state when no servers are configured', () => {
    const { config: restored, mcpToolsPending } = roundTrip(DEFAULT_CONFIGURATION, 'Test', {
      model: makeModel(),
      mcpServers: [],
    });

    expect(restored.selectedMcpServerIds).toEqual([]);
    expect(restored.mcpToolSelections).toEqual({});
    expect(mcpToolsPending).toBeUndefined();
  });
});
