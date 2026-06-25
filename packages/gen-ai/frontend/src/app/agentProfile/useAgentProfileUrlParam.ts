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
  playgroundModelsLoaded,
}: {
  mcpServers: MCPServerFromAPI[];
  mcpServersLoaded: boolean;
  /** Wait for playground models before deserializing so selectedModel is always a full Llama Stack ID */
  playgroundModelsLoaded: boolean;
}): UseAgentProfileUrlParamResult => {
  const [searchParams] = useSearchParams();
  const agentProfileId = searchParams.get(AGENT_PROFILE_ID_PARAM);

  const { namespace } = React.useContext(GenAiContext);
  const { models: playgroundModels } = React.useContext(ChatbotContext);
  const { api, apiAvailable } = useGenAiAPI();

  // Refs for values used only inside the fetch callback — keep them current without
  // adding to the effect dep array, which would cancel in-flight fetches on every render.
  const playgroundModelsRef = React.useRef(playgroundModels);
  playgroundModelsRef.current = playgroundModels;
  const mcpServersRef = React.useRef(mcpServers);
  mcpServersRef.current = mcpServers;

  const applyAgentProfile = useChatbotConfigStore((s) => s.applyAgentProfile);
  const setLoadedProfileSpec = useChatbotConfigStore((s) => s.setLoadedProfileSpec);
  const updateActivePrompt = useChatbotConfigStore((s) => s.updateActivePrompt);
  const updateSystemInstruction = useChatbotConfigStore((s) => s.updateSystemInstruction);
  const saveToolSelections = useChatbotConfigStore((s) => s.saveToolSelections);
  // Skip re-fetching when handleProfileSaved already applied this profile (e.g. after Save/Save As)
  const loadedProfileId = useChatbotConfigStore((s) => s.loadedProfileId);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  // Track the last profile ID we applied to prevent double-application in StrictMode
  const appliedProfileId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!agentProfileId) {
      // URL param cleared (e.g. "New agent configuration") — reset so the same
      // profile can be re-loaded in a future navigation without being blocked.
      appliedProfileId.current = null;
      return;
    }
    if (
      !namespace?.name ||
      !apiAvailable ||
      !mcpServersLoaded ||
      !playgroundModelsLoaded ||
      appliedProfileId.current === agentProfileId ||
      loadedProfileId === agentProfileId
    ) {
      return;
    }

    appliedProfileId.current = agentProfileId;
    setLoading(true);
    setError(undefined);

    let cancelled = false;

    api
      .getAgentProfile({ id: agentProfileId, namespace: namespace.name })
      .then((profile) => {
        if (cancelled) {
          return;
        }

        const { config, promptRef, mcpToolsPending } = deserializeAgentProfile(profile, {
          playgroundModels: playgroundModelsRef.current,
          mcpServers: mcpServersRef.current,
        });

        applyAgentProfile(
          config,
          agentProfileId,
          profile.spec.displayName,
          profile.spec.description,
        );

        // Restore MCP tool selections — mcpServers is guaranteed loaded at this point.
        // mcpToolsPending is now keyed by server URL (same canonical format as
        // selectedMcpServerIds), so no secondary name→URL lookup is needed here.
        if (mcpToolsPending) {
          for (const [serverUrl, tools] of Object.entries(mcpToolsPending)) {
            saveToolSelections(DEFAULT_CONFIG_ID, namespace.name, serverUrl, tools);
          }
        }

        // Load the MLflow prompt asynchronously — doesn't block the profile load.
        // setLoadedProfileSpec is deferred until after the prompt lands so the dirty
        // check doesn't fire a false positive while activePrompt is still null.
        if (promptRef) {
          const versionParam =
            promptRef.version !== undefined ? { version: String(promptRef.version) } : {};
          api
            .getMLflowPrompt({ name: promptRef.name, ...versionParam })
            .then((prompt) => {
              // Check the store instead of `cancelled`: StrictMode cleanup sets cancelled=true
              // even after applyAgentProfile has committed, causing the prompt to be discarded.
              if (useChatbotConfigStore.getState().loadedProfileId !== agentProfileId) {
                return;
              }
              updateActivePrompt(DEFAULT_CONFIG_ID, prompt);
              const instruction =
                prompt.template ?? prompt.messages?.find((m) => m.role === 'system')?.content ?? '';
              updateSystemInstruction(DEFAULT_CONFIG_ID, instruction);
              setLoadedProfileSpec(profile.spec);
            })
            .catch((promptErr) => {
              // Prompt load failure is non-fatal — the rest of the profile is already applied.
              // Still set the snapshot so the dirty guard works for the non-prompt fields.
              if (useChatbotConfigStore.getState().loadedProfileId !== agentProfileId) {
                return;
              }
              // eslint-disable-next-line no-console
              console.error('[useAgentProfileUrlParam] Failed to load MLflow prompt', promptErr);
              setLoadedProfileSpec(profile.spec);
            });
        } else {
          // No prompt to load — set the dirty-detection baseline immediately.
          setLoadedProfileSpec(profile.spec);
        }

        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) {
          return;
        }
        appliedProfileId.current = null; // allow retry if caller re-mounts
        setError(err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      // Reset so a re-mount (e.g. React StrictMode double-invoke) can retry the fetch.
      // Once the profile lands, loadedProfileId === agentProfileId prevents re-fetching.
      appliedProfileId.current = null;
    };
  }, [
    agentProfileId,
    namespace?.name,
    apiAvailable,
    mcpServersLoaded,
    playgroundModelsLoaded,
    loadedProfileId,
    api,
    applyAgentProfile,
    setLoadedProfileSpec,
    updateActivePrompt,
    updateSystemInstruction,
    saveToolSelections,
  ]);

  return { loading, error };
};

export default useAgentProfileUrlParam;
