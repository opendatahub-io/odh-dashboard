import { DEFAULT_CONFIGURATION, ChatbotConfiguration } from '~/app/Chatbot/store/types';
import { LlamaModel } from '~/app/types';
import { MCPServerFromAPI } from '~/app/types/mcp';
import { isMaasLlamaModelId } from '~/app/utilities/utils';
import { AgentProfile } from './types';

export type AgentProfileDeserializationContext = {
  /**
   * Playground models from useFetchLlamaModels. Used to resolve the AI Asset model_id
   * (spec.model.id) back to the Llama Stack runtime model ID (LlamaModel.id) that
   * selectedModel in the store expects.
   */
  playgroundModels: LlamaModel[];
  /**
   * Available MCP servers from useFetchMCPServers. When provided, server ConfigMap key names
   * are resolved to their runtime URLs so that selectedMcpServerIds and mcpToolsPending keys
   * use the same URL-based canonical identifier that the rest of the store and serialize layer
   * expects. When omitted the raw ConfigMap key (server name) is used as a fallback.
   */
  mcpServers?: MCPServerFromAPI[];
};

export type AgentProfilePromptRef = {
  name: string;
  version?: number;
  source: string;
};

export type AgentProfileDeserializeResult = {
  /** Apply to the store via resetConfiguration(result.config) */
  config: Partial<ChatbotConfiguration>;
  /**
   * When present, fetch this prompt from MLflow and call updateActivePrompt().
   * Not applied synchronously because it requires an async API call.
   */
  promptRef?: AgentProfilePromptRef;
  /**
   * Maps MCP server name (ConfigMap key) → allowed tools from the profile.
   * Cannot be written to mcpToolSelections synchronously because the store
   * structure requires the server's runtime URL, which is only available after
   * the MCP server list is loaded. Pass this to applyMcpToolSelections() once
   * server data is available.
   */
  mcpToolsPending?: Record<string, string[]>;
};

/**
 * Converts an AgentProfile API response into Playground store configuration.
 *
 * Call resetConfiguration(result.config) to apply the synchronous fields.
 * Then handle result.promptRef and result.mcpToolsPending asynchronously.
 */
export const deserializeAgentProfile = (
  profile: AgentProfile,
  context: AgentProfileDeserializationContext,
): AgentProfileDeserializeResult => {
  const { spec } = profile;
  const { playgroundModels, mcpServers = [] } = context;

  // Resolve AI Asset model_id → Llama Stack runtime ID (LlamaModel.id).
  // LlamaModel.modelId is the prefix-stripped form of the Llama Stack ID, which matches
  // the AI Asset model_id stored in spec.model.id.
  const matchingPlaygroundModel = playgroundModels.find((m) => {
    if (m.modelId !== spec.model.id) {
      return false;
    }
    return spec.model.sourceType === 'maas' ? isMaasLlamaModelId(m.id) : !isMaasLlamaModelId(m.id);
  });
  const selectedModel = matchingPlaygroundModel?.id ?? spec.model.id;

  const config: Partial<ChatbotConfiguration> = {
    selectedModel,
    selectedSubscription: spec.model.authorization?.maasSubscription ?? '',
    temperature: spec.temperature ?? DEFAULT_CONFIGURATION.temperature,
    isStreamingEnabled: spec.stream ?? DEFAULT_CONFIGURATION.isStreamingEnabled,
    // Prompt is handled via promptRef below
    activePrompt: null,
    dirtyPrompt: null,
    variableValues: {},
  };

  // RAG: storeRef (ConfigMap-backed) → external mode; id (direct Llama Stack ID) → inline mode
  if (spec.vectorStores?.stores.length) {
    const firstStore = spec.vectorStores.stores[0];
    config.isRagEnabled = true;
    if (firstStore.storeRef) {
      config.knowledgeMode = 'external';
      // storeRef.key is the vector_store_id the external vector store dropdown expects
      config.selectedVectorStoreId = firstStore.storeRef.key || null;
    } else {
      config.knowledgeMode = 'inline';
      config.selectedVectorStoreId = firstStore.id ?? null;
    }
  } else {
    config.isRagEnabled = false;
    config.knowledgeMode = DEFAULT_CONFIGURATION.knowledgeMode;
    config.selectedVectorStoreId = null;
  }

  // MCP servers: restore selected server IDs.
  // Resolve ConfigMap key (server name) → runtime URL via the mcpServers list so that
  // selectedMcpServerIds uses the same URL-based canonical identifier that the store,
  // serialize, and UI layers all expect.  Falls back to the raw key when the server
  // is not found in the provided list (e.g. in unit tests without a server list).
  if (spec.mcpServers?.length) {
    config.selectedMcpServerIds = spec.mcpServers
      .map((s) => {
        const key = s.serverRef.key ?? s.serverRef.name;
        const match = mcpServers.find((ms) => ms.name === key);
        return match?.url ?? key;
      })
      .filter(Boolean);
    // mcpToolSelections restored after server list is available (see mcpToolsPending)
    config.mcpToolSelections = {};
  } else {
    config.selectedMcpServerIds = [];
    config.mcpToolSelections = {};
  }

  // ASR (transcription) model
  if (spec.asr?.model?.id) {
    config.selectedAsrModel = spec.asr.model.id;
    config.isAsrModelEnabled = true;
  } else {
    config.selectedAsrModel = DEFAULT_CONFIGURATION.selectedAsrModel;
    config.isAsrModelEnabled = DEFAULT_CONFIGURATION.isAsrModelEnabled;
  }

  // Guardrails are intentionally not deserialized — see serialize.ts for the rationale.
  // Any guardrails in the profile are ignored; the Playground starts with guardrails cleared.
  config.guardrail = '';
  config.guardrailUserInputEnabled = false;
  config.guardrailModelOutputEnabled = false;
  config.guardrailSubscription = '';

  // Prompt ref for async loading
  const promptRef: AgentProfilePromptRef | undefined = spec.prompt
    ? {
        name: spec.prompt.name,
        version: spec.prompt.version !== undefined ? Number(spec.prompt.version) : undefined,
        source: spec.prompt.source,
      }
    : undefined;

  // If the profile had variable values, carry them forward for after prompt load
  if (promptRef && spec.prompt?.variables) {
    config.variableValues = Object.fromEntries(
      Object.entries(spec.prompt.variables).map(([key, v]) => [key, v.text]),
    );
  }

  // MCP tool selections pending: server URL → allowed tools.
  // Keyed by URL (same canonical format as selectedMcpServerIds) so that callers
  // can write directly to mcpToolSelections without a second name→URL lookup.
  // Filter on !== undefined so allowedTools: [] (block all tools) is preserved;
  // allowedTools: undefined means "all tools allowed" and needs no restriction applied.
  const mcpToolsPending: Record<string, string[]> | undefined = spec.mcpServers?.length
    ? Object.fromEntries(
        spec.mcpServers
          .filter((s) => s.allowedTools !== undefined)
          .map((s) => {
            const key = s.serverRef.key ?? s.serverRef.name;
            const match = mcpServers.find((ms) => ms.name === key);
            return [match?.url ?? key, s.allowedTools ?? []];
          }),
      )
    : undefined;

  return {
    config,
    promptRef,
    mcpToolsPending:
      mcpToolsPending && Object.keys(mcpToolsPending).length > 0 ? mcpToolsPending : undefined,
  };
};
