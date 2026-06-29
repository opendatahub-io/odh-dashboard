import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { GenAiContext } from '~/app/context/GenAiContext';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { MCPServerFromAPI } from '~/app/types/mcp';
import { DEFAULT_CONFIG_ID, useChatbotConfigStore } from '~/app/Chatbot/store';
import { deserializeAgentProfile } from './deserialize';
import { buildValidationWarnings, validateAgentProfileAsync } from './validateAgentProfile';

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
  const { models: playgroundModels, modelsLoaded, aiModels } = React.useContext(ChatbotContext);
  const { api, apiAvailable } = useGenAiAPI();

  // Refs for values used only inside the fetch callback — keep them current without
  // adding to the effect dep array, which would cancel in-flight fetches on every render.
  const playgroundModelsRef = React.useRef(playgroundModels);
  playgroundModelsRef.current = playgroundModels;
  const aiModelsRef = React.useRef(aiModels);
  aiModelsRef.current = aiModels;
  const mcpServersRef = React.useRef(mcpServers);
  mcpServersRef.current = mcpServers;
  const applyAgentProfile = useChatbotConfigStore((s) => s.applyAgentProfile);
  const setLoadedProfileSpec = useChatbotConfigStore((s) => s.setLoadedProfileSpec);
  const setLoadedProfileWarnings = useChatbotConfigStore((s) => s.setLoadedProfileWarnings);
  const setLoadedResourceVersion = useChatbotConfigStore((s) => s.setLoadedResourceVersion);
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
      !modelsLoaded ||
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
      .then(async (profile) => {
        if (cancelled) {
          setLoading(false);
          return;
        }

        const { config, mcpToolsPending } = deserializeAgentProfile(profile, {
          playgroundModels: playgroundModelsRef.current,
          mcpServers: mcpServersRef.current,
        });

        applyAgentProfile(
          config,
          agentProfileId,
          profile.spec.displayName,
          profile.spec.description,
        );
        setLoadedResourceVersion(profile.metadata.resourceVersion);

        // Sync warnings are set immediately so the OpenAgentProfileModal can show
        // the alert (and bypass localStorage) as soon as the profile is applied.
        const syncWarnings = buildValidationWarnings(profile, {
          playgroundModels: playgroundModelsRef.current,
          aiModels: aiModelsRef.current,
          mcpServers: mcpServersRef.current,
        });
        // Guard matches the check used for the async writes below — only commit warnings
        // if this profile is still the active one (rapid navigation / Save As can change it).
        if (useChatbotConfigStore.getState().loadedProfileId === agentProfileId) {
          setLoadedProfileWarnings(syncWarnings.length > 0 ? syncWarnings : null);
        }

        // Restore MCP tool selections — mcpServers is guaranteed loaded at this point.
        if (mcpToolsPending) {
          for (const [serverUrl, tools] of Object.entries(mcpToolsPending)) {
            saveToolSelections(DEFAULT_CONFIG_ID, namespace.name, serverUrl, tools);
          }
        }

        // Async validation: prompt availability, vector store existence.
        // setLoadedProfileSpec and final loadedProfileWarnings are written after this
        // settles so the dirty check and warning alert have complete data.
        const asyncResult = await validateAgentProfileAsync(profile, api);

        // Bail out if a different profile has been loaded in the meantime (StrictMode /
        // rapid navigation). cancelled is intentionally NOT used here — see applyAgentProfile.
        if (useChatbotConfigStore.getState().loadedProfileId !== agentProfileId) {
          return;
        }

        // Apply the resolved prompt returned by validation (no separate fetch needed).
        if (asyncResult.resolvedPrompt) {
          const { resolvedPrompt } = asyncResult;
          updateActivePrompt(DEFAULT_CONFIG_ID, resolvedPrompt);
          const instruction =
            resolvedPrompt.template ??
            resolvedPrompt.messages?.find((m) => m.role === 'system')?.content ??
            '';
          updateSystemInstruction(DEFAULT_CONFIG_ID, instruction);
        }

        // Merge sync + async warnings and update the store once.
        const asyncWarnings = asyncResult.warnings;
        const allWarnings = [...syncWarnings, ...asyncWarnings];
        setLoadedProfileWarnings(allWarnings.length > 0 ? allWarnings : null);
        setLoadedProfileSpec(profile.spec);

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
    modelsLoaded,
    loadedProfileId,
    api,
    applyAgentProfile,
    setLoadedProfileSpec,
    setLoadedProfileWarnings,
    setLoadedResourceVersion,
    updateActivePrompt,
    updateSystemInstruction,
    saveToolSelections,
  ]);

  return { loading, error };
};

export default useAgentProfileUrlParam;
