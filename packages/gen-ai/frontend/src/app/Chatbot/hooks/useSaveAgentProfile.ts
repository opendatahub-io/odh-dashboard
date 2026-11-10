import * as React from 'react';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { serializeToAgentProfileSpec } from '~/app/agentProfile/serialize';
import { AgentProfileSpec } from '~/app/agentProfile/types';
import {
  convertMaaSModelToAIModel,
  resolveAIModelForPlaygroundSelection,
} from '~/app/utilities/utils';
import { MCPServerFromAPI } from '~/app/types/mcp';
import { DEFAULT_CONFIG_ID, useChatbotConfigStore } from '~/app/Chatbot/store';
import { usePromptEdited } from '~/app/Chatbot/hooks/usePromptEdited';

const MCP_CONFIG_MAP_NAME_FALLBACK = 'gen-ai-aa-mcp-servers';

type SaveAgentProfileOptions = {
  mode: 'save' | 'save-as';
  name: string;
  description?: string;
  /** Keeps the saved prompt name aligned with the save-modal preview. */
  promptName?: string;
};

export type SavedAgentProfile = {
  profileId: string;
  displayName: string;
  resourceVersion: string;
  spec: AgentProfileSpec;
};

type UseSaveAgentProfileReturn = {
  saveAgentProfile: (options: SaveAgentProfileOptions) => Promise<SavedAgentProfile>;
};

/** Persists the current Playground configuration as an AgentProfile. */
const useSaveAgentProfile = (
  mcpServers: MCPServerFromAPI[],
  mcpConfigMapName: string | null,
): UseSaveAgentProfileReturn => {
  const { api, apiAvailable } = useGenAiAPI();
  const { aiModels, maasModels, models: playgroundModels } = React.useContext(ChatbotContext);
  const config = useChatbotConfigStore((state) => state.configurations[DEFAULT_CONFIG_ID]);
  const loadedProfileId = useChatbotConfigStore((state) => state.loadedProfileId);
  const loadedResourceVersion = useChatbotConfigStore((state) => state.loadedResourceVersion);
  const loadedProfileSpec = useChatbotConfigStore((state) => state.loadedProfileSpec);
  const isPromptDirty = usePromptEdited(DEFAULT_CONFIG_ID);
  const autoPromptName = React.useRef(`agent-prompt-${Math.random().toString(36).slice(2, 6)}`);

  const allAIModels = React.useMemo(
    () => [...aiModels, ...maasModels.map(convertMaaSModelToAIModel)],
    [aiModels, maasModels],
  );
  const aiModel = React.useMemo(
    () =>
      config?.selectedModel
        ? resolveAIModelForPlaygroundSelection(config.selectedModel, playgroundModels, allAIModels)
        : undefined,
    [allAIModels, config?.selectedModel, playgroundModels],
  );
  const asrModel = React.useMemo(
    () =>
      config?.isAsrModelEnabled && config.selectedAsrModel
        ? aiModels.find((model) => model.model_id === config.selectedAsrModel)
        : undefined,
    [aiModels, config?.isAsrModelEnabled, config?.selectedAsrModel],
  );

  const saveAgentProfile = React.useCallback(
    async ({
      mode,
      name,
      description,
      promptName: previewPromptName,
    }: SaveAgentProfileOptions): Promise<SavedAgentProfile> => {
      if (!config || !apiAvailable || !name.trim()) {
        throw new Error('The agent profile cannot be saved.');
      }

      const { activePrompt, dirtyPrompt, systemInstruction } = config;
      if (isPromptDirty || !activePrompt) {
        const promptName = activePrompt?.name ?? previewPromptName ?? autoPromptName.current;
        const template = dirtyPrompt?.template ?? systemInstruction;
        const registeredPrompt = await api.registerMLflowPrompt({ name: promptName, template });
        useChatbotConfigStore
          .getState()
          .updateActivePrompt(DEFAULT_CONFIG_ID, { ...registeredPrompt, template });
      }

      const freshConfig =
        useChatbotConfigStore.getState().configurations[DEFAULT_CONFIG_ID] ?? config;
      const spec = serializeToAgentProfileSpec(
        freshConfig,
        name.trim(),
        description?.trim() || undefined,
        {
          model: aiModel,
          asrModel,
          mcpServers,
          previousMcpServers: loadedProfileSpec?.mcpServers,
          mcpConfigMapName: mcpConfigMapName ?? MCP_CONFIG_MAP_NAME_FALLBACK,
        },
      );

      if (mode === 'save-as' || !loadedProfileId) {
        const response = await api.createAgentProfile({ spec });
        return {
          profileId: response.profileId,
          displayName: response.displayName,
          resourceVersion: response.resourceVersion,
          spec,
        };
      }

      const response = await api.updateAgentProfile({
        id: loadedProfileId,
        spec,
        resourceVersion: loadedResourceVersion ?? '',
      });
      return {
        profileId: loadedProfileId,
        displayName: response.displayName,
        resourceVersion: response.resourceVersion,
        spec,
      };
    },
    [
      aiModel,
      api,
      apiAvailable,
      asrModel,
      config,
      isPromptDirty,
      loadedProfileId,
      loadedProfileSpec?.mcpServers,
      loadedResourceVersion,
      mcpConfigMapName,
      mcpServers,
    ],
  );

  return { saveAgentProfile };
};

export default useSaveAgentProfile;
