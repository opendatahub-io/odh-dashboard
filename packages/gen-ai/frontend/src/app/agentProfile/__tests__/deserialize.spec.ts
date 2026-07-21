/* eslint-disable camelcase */
import { DEFAULT_CONFIGURATION } from '~/app/Chatbot/store/types';
import { LlamaModel } from '~/app/types';
import { AgentProfile } from '~/app/agentProfile/types';
import {
  AgentProfileDeserializationContext,
  deserializeAgentProfile,
} from '~/app/agentProfile/deserialize';

const makeLlamaModel = (overrides: Partial<LlamaModel> = {}): LlamaModel => ({
  id: 'vllm-inference-1/llama-3-70b',
  modelId: 'ai-asset-llama-3-70b',
  object: 'model',
  created: 0,
  owned_by: '',
  ...overrides,
});

const makeContext = (
  overrides: Partial<AgentProfileDeserializationContext> = {},
): AgentProfileDeserializationContext => ({
  playgroundModels: [],
  ...overrides,
});

const makeProfile = (overrides: Partial<AgentProfile['spec']> = {}): AgentProfile => ({
  apiVersion: 'genai.redhat.com/v1alpha1',
  kind: 'AgentProfile',
  metadata: { name: 'test-uuid', resourceVersion: '999' },
  spec: {
    displayName: 'Test Agent',
    model: { id: 'ai-asset-llama-3-70b', uri: 'http://llama.svc/v1', sourceType: 'namespace' },
    temperature: 0.7,
    stream: true,
    ...overrides,
  },
});

describe('deserializeAgentProfile', () => {
  describe('model resolution', () => {
    it('should resolve AI Asset model_id to Llama Stack runtime ID via playgroundModels', () => {
      const llamaModel = makeLlamaModel();
      const { config } = deserializeAgentProfile(
        makeProfile(),
        makeContext({ playgroundModels: [llamaModel] }),
      );

      expect(config.selectedModel).toBe('vllm-inference-1/llama-3-70b');
    });

    it('should fall back to spec.model.id when no matching playground model is found', () => {
      const { config } = deserializeAgentProfile(makeProfile(), makeContext());

      expect(config.selectedModel).toBe('ai-asset-llama-3-70b');
    });

    it('should match MaaS model using maas- provider prefix', () => {
      const maasLlamaModel = makeLlamaModel({ id: 'maas-vllm/granite-3b', modelId: 'granite-3b' });
      const profile = makeProfile({
        model: { id: 'granite-3b', uri: 'https://api.com', sourceType: 'maas' },
      });
      const { config } = deserializeAgentProfile(
        profile,
        makeContext({ playgroundModels: [maasLlamaModel] }),
      );

      expect(config.selectedModel).toBe('maas-vllm/granite-3b');
    });

    it('should not match a MaaS playground model for a non-MaaS profile model', () => {
      const maasLlamaModel = makeLlamaModel({
        id: 'maas-vllm/ai-asset-llama-3-70b',
        modelId: 'ai-asset-llama-3-70b',
      });
      // profile sourceType is 'namespace', not 'maas'
      const { config } = deserializeAgentProfile(
        makeProfile(),
        makeContext({ playgroundModels: [maasLlamaModel] }),
      );

      // Should not match — falls back to the AI Asset ID
      expect(config.selectedModel).toBe('ai-asset-llama-3-70b');
    });
  });

  describe('inference params', () => {
    it('should restore temperature and stream', () => {
      const { config } = deserializeAgentProfile(
        makeProfile({ temperature: 0.3, stream: false }),
        makeContext(),
      );
      expect(config.temperature).toBe(0.3);
      expect(config.isStreamingEnabled).toBe(false);
    });

    it('should fall back to defaults when temperature and stream are absent', () => {
      const profile = makeProfile();
      delete profile.spec.temperature;
      delete profile.spec.stream;
      const { config } = deserializeAgentProfile(profile, makeContext());

      expect(config.temperature).toBe(DEFAULT_CONFIGURATION.temperature);
      expect(config.isStreamingEnabled).toBe(DEFAULT_CONFIGURATION.isStreamingEnabled);
    });

    it('should restore maasSubscription from model authorization', () => {
      const { config } = deserializeAgentProfile(
        makeProfile({
          model: {
            id: 'granite',
            uri: 'https://api.com',
            authorization: { maasSubscription: 'sub-abc' },
          },
        }),
        makeContext(),
      );
      expect(config.selectedSubscription).toBe('sub-abc');
    });

    it('should set empty subscription when no authorization', () => {
      const { config } = deserializeAgentProfile(makeProfile(), makeContext());
      expect(config.selectedSubscription).toBe('');
    });
  });

  describe('prompt handling', () => {
    it('should return promptRef when spec.prompt is present', () => {
      const profile = makeProfile({
        prompt: { name: 'my-prompt', source: 'mlflow', version: '3' },
      });
      const { promptRef } = deserializeAgentProfile(profile, makeContext());

      expect(promptRef).toEqual({ name: 'my-prompt', version: 3, source: 'mlflow' });
    });

    it('should return promptRef without version when version is absent', () => {
      const profile = makeProfile({ prompt: { name: 'my-prompt', source: 'mlflow' } });
      const { promptRef } = deserializeAgentProfile(profile, makeContext());

      expect(promptRef?.version).toBeUndefined();
    });

    it('should set activePrompt to null (async load required)', () => {
      const profile = makeProfile({ prompt: { name: 'my-prompt', source: 'mlflow' } });
      const { config } = deserializeAgentProfile(profile, makeContext());

      expect(config.activePrompt).toBeNull();
    });

    it('should restore variableValues from spec.prompt.variables', () => {
      const profile = makeProfile({
        prompt: {
          name: 'my-prompt',
          source: 'mlflow',
          variables: {
            company_name: { text: 'Acme Corp', type: 'string' },
            tone: { text: 'friendly', type: 'string' },
          },
        },
      });
      const { config } = deserializeAgentProfile(profile, makeContext());

      expect(config.variableValues).toEqual({ company_name: 'Acme Corp', tone: 'friendly' });
    });

    it('should return no promptRef when spec.prompt is absent', () => {
      const { promptRef } = deserializeAgentProfile(makeProfile(), makeContext());
      expect(promptRef).toBeUndefined();
    });
  });

  describe('vectorStores', () => {
    it('should restore external RAG from storeRef', () => {
      const profile = makeProfile({
        vectorStores: {
          stores: [
            { storeRef: { kind: 'ConfigMap', name: 'gen-ai-aa-vector-stores', key: 'vs-abc123' } },
          ],
        },
      });
      const { config } = deserializeAgentProfile(profile, makeContext());

      expect(config.isRagEnabled).toBe(true);
      expect(config.knowledgeMode).toBe('external');
      expect(config.selectedVectorStoreId).toBe('vs-abc123');
    });

    it('should restore inline RAG from direct id', () => {
      const profile = makeProfile({
        vectorStores: { stores: [{ id: 'vs_203e7612-0bb8-41db-89f1-18f054985139' }] },
      });
      const { config } = deserializeAgentProfile(profile, makeContext());

      expect(config.isRagEnabled).toBe(true);
      expect(config.knowledgeMode).toBe('inline');
      expect(config.selectedVectorStoreId).toBe('vs_203e7612-0bb8-41db-89f1-18f054985139');
    });

    it('should disable RAG when vectorStores is absent', () => {
      const { config } = deserializeAgentProfile(makeProfile(), makeContext());

      expect(config.isRagEnabled).toBe(false);
      expect(config.selectedVectorStoreId).toBeNull();
    });

    it('should set selectedVectorStoreId to null when storeRef has no key', () => {
      const profile = makeProfile({
        vectorStores: { stores: [{ storeRef: { kind: 'ConfigMap', name: 'vs', key: '' } }] },
      });
      const { config } = deserializeAgentProfile(profile, makeContext());

      expect(config.selectedVectorStoreId).toBeNull();
    });
  });

  describe('mcpServers', () => {
    it('should restore selectedMcpServerIds from serverRef.key', () => {
      const profile = makeProfile({
        mcpServers: [
          { serverRef: { kind: 'ConfigMap', name: 'mcp-config', key: 'weather-server' } },
          { serverRef: { kind: 'ConfigMap', name: 'mcp-config', key: 'code-server' } },
        ],
      });
      const { config } = deserializeAgentProfile(profile, makeContext());

      expect(config.selectedMcpServerIds).toEqual(['weather-server', 'code-server']);
    });

    it('should fall back to serverRef.name when key is absent', () => {
      const profile = makeProfile({
        mcpServers: [{ serverRef: { kind: 'MCPServer', name: 'my-server' } }],
      });
      const { config } = deserializeAgentProfile(profile, makeContext());

      expect(config.selectedMcpServerIds).toEqual(['my-server']);
    });

    it('should return mcpToolsPending with allowedTools keyed by server name', () => {
      const profile = makeProfile({
        mcpServers: [
          {
            serverRef: { kind: 'ConfigMap', name: 'mcp-config', key: 'weather-server' },
            allowedTools: ['get_forecast', 'get_alerts'],
          },
        ],
      });
      const { mcpToolsPending } = deserializeAgentProfile(profile, makeContext());

      expect(mcpToolsPending).toEqual({ 'weather-server': ['get_forecast', 'get_alerts'] });
    });

    it('should return undefined mcpToolsPending when no servers have allowedTools defined', () => {
      const profile = makeProfile({
        mcpServers: [
          { serverRef: { kind: 'ConfigMap', name: 'mcp-config', key: 'weather-server' } },
        ],
      });
      const { mcpToolsPending } = deserializeAgentProfile(profile, makeContext());

      expect(mcpToolsPending).toBeUndefined();
    });

    it('should preserve allowedTools: [] (block all tools) in mcpToolsPending', () => {
      const profile = makeProfile({
        mcpServers: [
          {
            serverRef: { kind: 'ConfigMap', name: 'mcp-config', key: 'weather-server' },
            allowedTools: [],
          },
        ],
      });
      const { mcpToolsPending } = deserializeAgentProfile(profile, makeContext());

      expect(mcpToolsPending).toEqual({ 'weather-server': [] });
    });

    it('should clear selectedMcpServerIds and mcpToolSelections when no servers', () => {
      const { config } = deserializeAgentProfile(makeProfile(), makeContext());

      expect(config.selectedMcpServerIds).toEqual([]);
      expect(config.mcpToolSelections).toEqual({});
    });
  });

  describe('asr field', () => {
    it('should restore selectedAsrModel and enable ASR when asr.model is present', () => {
      const profile = makeProfile({
        asr: { model: { id: 'whisper-large-v3', uri: 'http://whisper.svc/v1' } },
      });
      const { config } = deserializeAgentProfile(profile, makeContext());

      expect(config.selectedAsrModel).toBe('whisper-large-v3');
      expect(config.isAsrModelEnabled).toBe(true);
    });

    it('should clear ASR state when asr field is absent', () => {
      const { config } = deserializeAgentProfile(makeProfile(), makeContext());

      expect(config.selectedAsrModel).toBe('');
      expect(config.isAsrModelEnabled).toBe(false);
    });

    it('should clear ASR state when asr.model is absent', () => {
      const profile = makeProfile({ asr: {} });
      const { config } = deserializeAgentProfile(profile, makeContext());

      expect(config.selectedAsrModel).toBe('');
      expect(config.isAsrModelEnabled).toBe(false);
    });
  });

  describe('guardrails', () => {
    it('should always clear guardrail state regardless of profile contents', () => {
      const profileWithGuardrail = makeProfile({
        guardrails: [
          {
            provider: 'nvidia-guardian-8b',
            guardrailRef: { kind: 'ConfigMap', name: 'nvidia-guardian-8b', key: 'guardrail.yaml' },
          },
        ],
      });
      const { config } = deserializeAgentProfile(profileWithGuardrail, makeContext());

      expect(config.guardrail).toBe('');
      expect(config.guardrailUserInputEnabled).toBe(false);
      expect(config.guardrailModelOutputEnabled).toBe(false);
    });
  });
});
