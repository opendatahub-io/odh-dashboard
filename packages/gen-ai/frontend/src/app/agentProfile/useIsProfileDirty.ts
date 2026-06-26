import * as React from 'react';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { useChatbotConfigStore } from '~/app/Chatbot/store';
import useFetchMCPServers from '~/app/hooks/useFetchMCPServers';
import { convertMaaSModelToAIModel, isPlaygroundModelMatchForAIModel } from '~/app/utilities/utils';
import { serializeToAgentProfileSpec } from './serialize';
import type { AgentProfileSpec } from './types';

const MCP_CONFIG_MAP_NAME_FALLBACK = 'gen-ai-aa-mcp-servers';

/** JSON.stringify with recursively sorted object keys so insertion order doesn't affect equality. */
const stableStringify = (val: unknown): string =>
  JSON.stringify(val, (_key, v) => {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      return Object.fromEntries(Object.entries(v).toSorted(([a], [b]) => a.localeCompare(b)));
    }
    return v;
  });

// Fields excluded from dirty comparison: either not written by serializeToAgentProfileSpec
// (maxOutputTokens is in AgentProfileSpec but never serialized from config) or metadata-only.
const EXCLUDED_SPEC_KEYS = new Set(['displayName', 'description', 'guardrails', 'maxOutputTokens']);

/**
 * Strips fields not written by serializeToAgentProfileSpec (displayName, description,
 * guardrails) and sorts mcpServers/allowedTools for stable comparison.
 * New fields added to AgentProfileSpec are included automatically.
 */
const normalizeSpec = (spec: AgentProfileSpec) => ({
  ...Object.fromEntries(Object.entries(spec).filter(([k]) => !EXCLUDED_SPEC_KEYS.has(k))),
  mcpServers: spec.mcpServers
    ? spec.mcpServers
        .toSorted((a, b) =>
          (a.serverRef.key ?? a.serverRef.name).localeCompare(b.serverRef.key ?? b.serverRef.name),
        )
        .map((s) => ({
          ...s,
          allowedTools: s.allowedTools ? [...s.allowedTools].toSorted() : undefined,
        }))
    : undefined,
});

/**
 * Returns true when the current playground configuration differs from the last
 * saved/loaded agent profile spec.
 *
 * The comparison is serialization-based: the current config is serialized to an
 * AgentProfileSpec using the same path as the save flow, then compared against the
 * stored snapshot. This means "dirty" is defined as "saving now would produce a
 * different profile" — the same fields, the same normalization.
 *
 * Only meaningful when a profile is loaded (profileApplied === true). Returns false
 * when no profile is active or no snapshot is stored.
 */
const useIsProfileDirty = (configId: string): boolean => {
  const { aiModels, maasModels, models: playgroundModels } = React.useContext(ChatbotContext);
  const { data: mcpServers = [], configMapName: mcpConfigMapName } = useFetchMCPServers();

  const profileApplied = useChatbotConfigStore((s) => s.profileApplied);
  const loadedProfileSpec = useChatbotConfigStore((s) => s.loadedProfileSpec);
  const config = useChatbotConfigStore((s) => s.configurations[configId]);

  const allAIModels = React.useMemo(
    () => [...aiModels, ...maasModels.map(convertMaaSModelToAIModel)],
    [aiModels, maasModels],
  );

  const aiModel = React.useMemo(() => {
    const llamaModel = playgroundModels.find((m) => m.id === config?.selectedModel);
    return llamaModel
      ? allAIModels.find((ai) => isPlaygroundModelMatchForAIModel(llamaModel, ai))
      : undefined;
  }, [playgroundModels, config?.selectedModel, allAIModels]);

  const asrModel = React.useMemo(
    () =>
      config?.isAsrModelEnabled && config.selectedAsrModel
        ? aiModels.find((ai) => ai.model_id === config.selectedAsrModel)
        : undefined,
    [config?.isAsrModelEnabled, config?.selectedAsrModel, aiModels],
  );

  return React.useMemo(() => {
    if (!profileApplied || !loadedProfileSpec || !config) {
      return false;
    }

    const currentSpec = serializeToAgentProfileSpec(config, '', undefined, {
      model: aiModel,
      asrModel,
      mcpServers,
      mcpConfigMapName: mcpConfigMapName ?? MCP_CONFIG_MAP_NAME_FALLBACK,
    });

    return (
      stableStringify(normalizeSpec(currentSpec)) !==
      stableStringify(normalizeSpec(loadedProfileSpec))
    );
  }, [profileApplied, loadedProfileSpec, config, aiModel, asrModel, mcpServers, mcpConfigMapName]);
};

export default useIsProfileDirty;
