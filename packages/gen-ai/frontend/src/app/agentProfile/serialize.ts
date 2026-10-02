import { ChatbotConfiguration, McpToolSelectionsMap } from '~/app/Chatbot/store/types';
import { AIModel } from '~/app/types';
import { MCPServerFromAPI } from '~/app/types/mcp';
import { AgentProfileMcpServer, AgentProfileSpec, AgentProfilePromptVariable } from './types';

export type AgentProfileSerializationContext = {
  /** Full model object needed for URI and sourceType (not stored in config) */
  model: AIModel | undefined;
  /** Full ASR model object — when present and ASR is enabled, serialized as spec.asr.model */
  asrModel?: AIModel | undefined;
  /** Available MCP servers, used to resolve server name → URL for tool lookup */
  mcpServers: MCPServerFromAPI[];
  /** Saved references to keep when a previously selected server is currently unavailable. */
  previousMcpServers?: AgentProfileMcpServer[];
  /**
   * Name of the ConfigMap that holds all MCP server configs.
   * From MCPServersResponse.config_map_info.name.
   * When absent, ConfigMap-backed servers are omitted; registry servers can still be saved.
   */
  mcpConfigMapName?: string;
};

/** Collect all tool names for a given server URL across all namespaces */
const getToolsForServer = (
  toolSelections: McpToolSelectionsMap,
  serverUrl: string,
): string[] | undefined => {
  const tools: string[] = [];
  let hasSelection = false;
  for (const nsMap of Object.values(toolSelections)) {
    const serverMap: Record<string, string[]> | undefined = nsMap;
    const serverTools = serverMap?.[serverUrl];
    if (serverTools !== undefined) {
      hasSelection = true;
      tools.push(...serverTools);
    }
  }
  return hasSelection ? tools : undefined;
};

/**
 * Converts Playground store configuration into an AgentProfile spec body
 * suitable for POST or PUT to the AgentProfile BFF API.
 */
export const serializeToAgentProfileSpec = (
  config: ChatbotConfiguration,
  displayName: string,
  description: string | undefined,
  context: AgentProfileSerializationContext,
): AgentProfileSpec => {
  const {
    model,
    asrModel,
    mcpServers: availableServers,
    previousMcpServers,
    mcpConfigMapName,
  } = context;

  const spec: AgentProfileSpec = {
    displayName,
    description: description || undefined,
    model: {
      // Use the AI Asset catalog ID (model_id), not the Llama Stack runtime ID (selectedModel)
      id: model?.model_id ?? config.selectedModel,
      // Prefer internal endpoint (cluster-local); fall back to external
      uri: model?.internalEndpoint ?? model?.externalEndpoint ?? '',
      sourceType: model?.model_source_type,
      authorization: config.selectedSubscription
        ? { maasSubscription: config.selectedSubscription }
        : undefined,
    },
    temperature: config.temperature,
    stream: config.isStreamingEnabled,
  };

  // ASR (transcription) model — serialized as spec.asr.model using the same schema
  // as spec.model so the API can reference it via a common model-ref structure.
  if (config.isAsrModelEnabled && config.selectedAsrModel) {
    spec.asr = {
      model: {
        id: asrModel?.model_id ?? config.selectedAsrModel,
        uri: asrModel?.internalEndpoint ?? asrModel?.externalEndpoint ?? '',
        sourceType: asrModel?.model_source_type,
      },
    };
  }

  // Prompt: reference the active MLflow prompt by name + version
  if (config.activePrompt) {
    const variableEntries = Object.entries(config.variableValues);
    spec.prompt = {
      name: config.activePrompt.name,
      source: 'mlflow',
      version: String(config.activePrompt.version),
      variables:
        variableEntries.length > 0
          ? variableEntries.reduce<Record<string, AgentProfilePromptVariable>>(
              (acc, [key, text]) => {
                acc[key] = { text, type: 'string' };
                return acc;
              },
              {},
            )
          : undefined,
    };
  }

  // Vector stores
  if (config.isRagEnabled && config.selectedVectorStoreId) {
    if (config.knowledgeMode === 'external') {
      // External vector stores are ConfigMap-backed (gen-ai-aa-vector-stores).
      // The vector_store_id is the key within that ConfigMap's config.yaml.
      spec.vectorStores = {
        stores: [
          {
            storeRef: {
              kind: 'ConfigMap',
              name: 'gen-ai-aa-vector-stores',
              key: config.selectedVectorStoreId,
            },
          },
        ],
      };
    } else {
      // Inline vector stores are identified by their direct Llama Stack ID
      spec.vectorStores = {
        stores: [{ id: config.selectedVectorStoreId }],
      };
    }
  }

  // ConfigMap servers are stored as resource references; registry servers retain their
  // MLflow identity so they are not coupled to the dashboard ConfigMap.
  if (config.selectedMcpServerIds.length > 0 || previousMcpServers?.length) {
    const entries: AgentProfileMcpServer[] = [];
    for (const serverId of config.selectedMcpServerIds) {
      const server = availableServers.find((s) => s.url === serverId);
      if (!server) {
        continue;
      }
      const allowedTools = getToolsForServer(config.mcpToolSelections, server.url);
      if (server.source === 'registry') {
        entries.push({
          name: server.name,
          source: 'mlflow',
          version: server.version || undefined,
          allowedTools,
        });
      } else if (mcpConfigMapName) {
        entries.push({
          serverRef: { kind: 'ConfigMap', name: mcpConfigMapName, key: server.name },
          allowedTools,
        });
      }
    }
    // The Playground omits unreachable servers from its picker. Keep their saved
    // references unchanged so editing another profile field cannot silently erase them.
    previousMcpServers?.forEach((saved) => {
      const available = availableServers.some((server) => {
        if ('serverRef' in saved) {
          const name = saved.serverRef.key ?? saved.serverRef.name;
          return (
            server.name === name &&
            (saved.serverRef.kind !== 'ConfigMap' || server.source === 'configmap')
          );
        }
        return server.name === saved.name && server.source === 'registry';
      });
      if (!available) {
        entries.push(saved);
      }
    });
    if (entries.length > 0) {
      spec.mcpServers = entries;
    }
  }

  // Guardrails are intentionally not serialized.
  // The Playground uses an inline model reference (GuardrailInlineConfig) while
  // AgentProfile.spec.guardrails expects a K8s ConfigMap resource reference — a
  // different abstraction level. Mapping between the two requires the guardrail
  // ConfigMap schema to be defined first.

  return spec;
};
