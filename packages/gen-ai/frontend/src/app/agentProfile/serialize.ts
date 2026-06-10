import { ChatbotConfiguration, McpToolSelectionsMap } from '~/app/Chatbot/store/types';
import { AIModel } from '~/app/types';
import { MCPServerFromAPI } from '~/app/types/mcp';
import { AgentProfileMcpServer, AgentProfileSpec, AgentProfilePromptVariable } from './types';

export type AgentProfileSerializationContext = {
  /** Full model object needed for URI and sourceType (not stored in config) */
  model: AIModel | undefined;
  /** Available MCP servers, used to resolve server name → URL for tool lookup */
  mcpServers: MCPServerFromAPI[];
  /**
   * Name of the ConfigMap that holds all MCP server configs.
   * From MCPServersResponse.config_map_info.name.
   * When absent, MCP servers are omitted from the output.
   */
  mcpConfigMapName?: string;
};

/** Collect all tool names for a given server URL across all namespaces */
const getToolsForServer = (toolSelections: McpToolSelectionsMap, serverUrl: string): string[] => {
  const tools: string[] = [];
  for (const nsMap of Object.values(toolSelections)) {
    const serverMap: Record<string, string[]> | undefined = nsMap;
    const serverTools = serverMap?.[serverUrl];
    if (serverTools) {
      tools.push(...serverTools);
    }
  }
  return tools;
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
  const { model, mcpServers: availableServers, mcpConfigMapName } = context;

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

  // MCP servers: each selected server name maps to its key in the shared ConfigMap
  if (config.selectedMcpServerIds.length > 0 && mcpConfigMapName) {
    const entries: AgentProfileMcpServer[] = [];
    for (const serverId of config.selectedMcpServerIds) {
      const server = availableServers.find((s) => s.name === serverId);
      if (!server) {
        continue;
      }
      const allowedTools = getToolsForServer(config.mcpToolSelections, server.url);
      entries.push({
        serverRef: { kind: 'ConfigMap', name: mcpConfigMapName, key: server.name },
        allowedTools: allowedTools.length > 0 ? allowedTools : undefined,
      });
    }
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
