import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { GenAiContext } from '~/app/context/GenAiContext';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { MCPServerFromAPI } from '~/app/types/mcp';
import { DEFAULT_CONFIG_ID, useChatbotConfigStore } from '~/app/Chatbot/store';
import { deserializeAgentProfile } from './deserialize';

const AGENT_PROFILE_ID_PARAM = 'agentProfileId';

type UseAgentProfileUrlParamResult = {
  loading: boolean;
  error: Error | undefined;
};

/**
 * Reads `?agentProfileId=<uuid>` from the URL, fetches the profile from the BFF,
 * and applies it to the Playground store. Runs once on mount per profile ID.
 *
 * Waits for mcpServersLoaded before fetching so that MCP tool selections from the
 * profile can always be applied immediately without a separate retry.
 *
 * Requires GenAiContext (namespace) and ChatbotContext (playground models) to be in scope.
 */
const useAgentProfileUrlParam = ({
  mcpServers,
  mcpServersLoaded,
}: {
  mcpServers: MCPServerFromAPI[];
  mcpServersLoaded: boolean;
}): UseAgentProfileUrlParamResult => {
  const [searchParams] = useSearchParams();
  const agentProfileId = searchParams.get(AGENT_PROFILE_ID_PARAM);

  const { namespace } = React.useContext(GenAiContext);
  const { models: playgroundModels } = React.useContext(ChatbotContext);
  const { api, apiAvailable } = useGenAiAPI();

  const applyAgentProfile = useChatbotConfigStore((s) => s.applyAgentProfile);
  const updateActivePrompt = useChatbotConfigStore((s) => s.updateActivePrompt);
  const saveToolSelections = useChatbotConfigStore((s) => s.saveToolSelections);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  // Track the last profile ID we applied to prevent double-application in StrictMode
  const appliedProfileId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (
      !agentProfileId ||
      !namespace?.name ||
      !apiAvailable ||
      !mcpServersLoaded ||
      appliedProfileId.current === agentProfileId
    ) {
      return;
    }

    appliedProfileId.current = agentProfileId;
    setLoading(true);
    setError(undefined);

    api
      .getAgentProfile({ id: agentProfileId, namespace: namespace.name })
      .then((profile) => {
        const { config, promptRef, mcpToolsPending } = deserializeAgentProfile(profile, {
          playgroundModels,
        });

        applyAgentProfile(config);

        // Restore MCP tool selections — mcpServers is guaranteed loaded at this point
        if (mcpToolsPending) {
          for (const [serverName, tools] of Object.entries(mcpToolsPending)) {
            const server = mcpServers.find((s) => s.name === serverName);
            if (server) {
              saveToolSelections(DEFAULT_CONFIG_ID, namespace.name, server.url, tools);
            }
          }
        }

        // Load the MLflow prompt asynchronously — doesn't block the profile load
        if (promptRef) {
          const versionParam =
            promptRef.version !== undefined ? { version: String(promptRef.version) } : {};
          api
            .getMLflowPrompt({ name: promptRef.name, ...versionParam })
            .then((prompt) => {
              updateActivePrompt(DEFAULT_CONFIG_ID, prompt);
            })
            .catch((promptErr) => {
              // Prompt load failure is non-fatal — the rest of the profile is already applied
              // eslint-disable-next-line no-console
              console.error('[useAgentProfileUrlParam] Failed to load MLflow prompt', promptErr);
            });
        }

        setLoading(false);
      })
      .catch((err: Error) => {
        appliedProfileId.current = null; // allow retry if caller re-mounts
        setError(err);
        setLoading(false);
      });
  }, [
    agentProfileId,
    namespace?.name,
    apiAvailable,
    mcpServersLoaded,
    api,
    playgroundModels,
    mcpServers,
    applyAgentProfile,
    updateActivePrompt,
    saveToolSelections,
  ]);

  return { loading, error };
};

export default useAgentProfileUrlParam;
