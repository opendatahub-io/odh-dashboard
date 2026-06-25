/* eslint-disable camelcase */
import {
  buildValidationWarnings,
  validateAgentProfileAsync,
} from '~/app/agentProfile/validateAgentProfile';
import type { AgentProfile } from '~/app/agentProfile/types';
import type {
  LlamaModel,
  AIModel,
  GenAiAPIs,
  ExternalVectorStoreSummary,
  VectorStore,
} from '~/app/types';

const makeProfile = (overrides: Partial<AgentProfile['spec']> = {}): AgentProfile => ({
  apiVersion: 'genai.redhat.com/v1alpha1',
  kind: 'AgentProfile',
  metadata: { name: 'test-uuid', resourceVersion: '1' },
  spec: {
    displayName: 'Test Agent',
    model: { id: 'llama-3-70b', uri: 'http://llama.svc/v1', sourceType: 'namespace' },
    ...overrides,
  },
});

const makeLlamaModel = (modelId: string): LlamaModel => ({
  id: `vllm/${modelId}`,
  modelId,
  object: 'model',
  created: 0,
  owned_by: '',
});

const makeAIModel = (model_id: string): AIModel =>
  ({
    model_id,
    model_name: model_id,
    model_source_type: 'namespace',
    internalEndpoint: 'http://endpoint',
  }) as AIModel;

const makeApi = (overrides: Partial<GenAiAPIs> = {}): GenAiAPIs =>
  ({
    getMLflowPrompt: jest.fn().mockResolvedValue(null),
    getAAVectorStores: jest.fn().mockResolvedValue([]),
    listVectorStores: jest.fn().mockResolvedValue([]),
    ...overrides,
  }) as unknown as GenAiAPIs;

const baseContext = {
  playgroundModels: [makeLlamaModel('llama-3-70b')],
  aiModels: [] as AIModel[],
  mcpServers: [],
};

// ---------------------------------------------------------------------------
// buildValidationWarnings
// ---------------------------------------------------------------------------

describe('buildValidationWarnings', () => {
  it('should return no warnings when all resources resolve', () => {
    expect(buildValidationWarnings(makeProfile(), baseContext)).toHaveLength(0);
  });

  describe('model', () => {
    it('should warn when model is not in playgroundModels', () => {
      const warnings = buildValidationWarnings(makeProfile(), {
        ...baseContext,
        playgroundModels: [],
      });
      expect(warnings).toContain('Model "llama-3-70b" is no longer available.');
    });

    it('should not warn when model is present', () => {
      expect(
        buildValidationWarnings(makeProfile(), baseContext).some((w) => w.includes('Model')),
      ).toBe(false);
    });
  });

  describe('ASR model', () => {
    it('should warn when ASR model is not in aiModels', () => {
      const profile = makeProfile({ asr: { model: { id: 'whisper-v3', uri: '' } } });
      const warnings = buildValidationWarnings(profile, { ...baseContext, aiModels: [] });
      expect(warnings).toContain('Transcription model "whisper-v3" is no longer available.');
    });

    it('should not warn when ASR model is present', () => {
      const profile = makeProfile({ asr: { model: { id: 'whisper-v3', uri: '' } } });
      const warnings = buildValidationWarnings(profile, {
        ...baseContext,
        aiModels: [makeAIModel('whisper-v3')],
      });
      expect(warnings.some((w) => w.includes('Transcription'))).toBe(false);
    });

    it('should not warn when spec has no ASR section', () => {
      expect(
        buildValidationWarnings(makeProfile(), baseContext).some((w) =>
          w.includes('Transcription'),
        ),
      ).toBe(false);
    });
  });

  describe('MCP servers', () => {
    it('should warn when MCP server key is not in available servers', () => {
      const profile = makeProfile({
        mcpServers: [
          {
            serverRef: { kind: 'ConfigMap', name: 'gen-ai-aa-mcp-servers', key: 'my-server' },
          },
        ],
      });
      const warnings = buildValidationWarnings(profile, { ...baseContext, mcpServers: [] });
      expect(warnings).toContain('MCP server "my-server" is no longer available.');
    });

    it('should not warn when MCP server key resolves', () => {
      const profile = makeProfile({
        mcpServers: [
          {
            serverRef: { kind: 'ConfigMap', name: 'gen-ai-aa-mcp-servers', key: 'my-server' },
          },
        ],
      });
      const warnings = buildValidationWarnings(profile, {
        ...baseContext,
        mcpServers: [{ name: 'my-server', url: 'http://mcp.svc' } as never],
      });
      expect(warnings.some((w) => w.includes('MCP'))).toBe(false);
    });
  });

  it('should return multiple warnings when several resources are missing', () => {
    const profile = makeProfile({
      asr: { model: { id: 'whisper-v3', uri: '' } },
      mcpServers: [
        {
          serverRef: { kind: 'ConfigMap', name: 'gen-ai-aa-mcp-servers', key: 'gone-server' },
        },
      ],
    });
    expect(
      buildValidationWarnings(profile, { playgroundModels: [], aiModels: [], mcpServers: [] }),
    ).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// validateAgentProfileAsync
// ---------------------------------------------------------------------------

describe('validateAgentProfileAsync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return no warnings and no resolved data when profile has no async resources', async () => {
    const result = await validateAgentProfileAsync(makeProfile(), makeApi());
    expect(result.warnings).toHaveLength(0);
    expect(result.resolvedPrompt).toBeUndefined();
  });

  it('should not call vector store APIs when profile has no vector stores', async () => {
    const api = makeApi();
    await validateAgentProfileAsync(makeProfile(), api);
    expect(api.getAAVectorStores).not.toHaveBeenCalled();
    expect(api.listVectorStores).not.toHaveBeenCalled();
  });

  it('should not call prompt API when profile has no prompt', async () => {
    const api = makeApi();
    await validateAgentProfileAsync(makeProfile(), api);
    expect(api.getMLflowPrompt).not.toHaveBeenCalled();
  });

  describe('prompt', () => {
    it('should return resolvedPrompt when getMLflowPrompt succeeds', async () => {
      const mockPrompt = { name: 'my-prompt', version: 1, template: 'Hello' };
      const api = makeApi({ getMLflowPrompt: jest.fn().mockResolvedValue(mockPrompt) });
      const profile = makeProfile({
        prompt: { name: 'my-prompt', source: 'mlflow', version: '1' },
      });

      const result = await validateAgentProfileAsync(profile, api);

      expect(result.resolvedPrompt).toEqual(mockPrompt);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when getMLflowPrompt resolves null (prompt not found)', async () => {
      const api = makeApi({ getMLflowPrompt: jest.fn().mockResolvedValue(null) });
      const profile = makeProfile({
        prompt: { name: 'my-prompt', source: 'mlflow', version: '1' },
      });

      const result = await validateAgentProfileAsync(profile, api);

      expect(result.resolvedPrompt).toBeFalsy();
      expect(result.warnings).toContain('Prompt "my-prompt" is no longer available.');
    });

    it('should warn when getMLflowPrompt rejects', async () => {
      const api = makeApi({ getMLflowPrompt: jest.fn().mockRejectedValue(new Error('404')) });
      const profile = makeProfile({
        prompt: { name: 'gone-prompt', source: 'mlflow', version: '1' },
      });

      const result = await validateAgentProfileAsync(profile, api);

      expect(result.resolvedPrompt).toBeUndefined();
      expect(result.warnings).toContain('Prompt "gone-prompt" is no longer available.');
    });
  });

  describe('external (ConfigMap-backed) vector stores', () => {
    const externalStore: ExternalVectorStoreSummary = {
      vector_store_id: 'my-store',
      vector_store_name: 'My Store',
      provider_id: 'chroma',
      provider_type: 'inline',
      embedding_model: 'all-minilm',
      embedding_dimension: 384,
    };

    it('should return resolvedAAVectorStores and no warning when store is found', async () => {
      const api = makeApi({ getAAVectorStores: jest.fn().mockResolvedValue([externalStore]) });
      const profile = makeProfile({
        vectorStores: {
          stores: [
            { storeRef: { kind: 'ConfigMap', name: 'gen-ai-aa-vector-stores', key: 'my-store' } },
          ],
        },
      });

      const result = await validateAgentProfileAsync(profile, api);

      expect(result.resolvedAAVectorStores).toEqual([externalStore]);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when external store key is not in AA stores list', async () => {
      const api = makeApi({ getAAVectorStores: jest.fn().mockResolvedValue([]) });
      const profile = makeProfile({
        vectorStores: {
          stores: [
            {
              storeRef: { kind: 'ConfigMap', name: 'gen-ai-aa-vector-stores', key: 'gone-store' },
            },
          ],
        },
      });

      const result = await validateAgentProfileAsync(profile, api);

      expect(result.warnings).toContain('Vector store "gone-store" is no longer available.');
    });
  });

  describe('inline (Llama Stack) vector stores', () => {
    const llamaStore: VectorStore = {
      id: 'vs_abc123',
      created_at: 0,
      last_active_at: 0,
      file_counts: { in_progress: 0, completed: 0, failed: 0, cancelled: 0, total: 0 },
      metadata: { provider_id: 'chroma' },
    } as VectorStore;

    it('should return resolvedLlamaVectorStores and no warning when store is found', async () => {
      const api = makeApi({ listVectorStores: jest.fn().mockResolvedValue([llamaStore]) });
      const profile = makeProfile({ vectorStores: { stores: [{ id: 'vs_abc123' }] } });

      const result = await validateAgentProfileAsync(profile, api);

      expect(result.resolvedLlamaVectorStores).toEqual([llamaStore]);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when inline store ID is not in Llama Stack stores', async () => {
      const api = makeApi({ listVectorStores: jest.fn().mockResolvedValue([]) });
      const profile = makeProfile({ vectorStores: { stores: [{ id: 'vs_gone' }] } });

      const result = await validateAgentProfileAsync(profile, api);

      expect(result.warnings).toContain('Vector store "vs_gone" is no longer available.');
    });
  });
});
