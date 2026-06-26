import {
  AIModel,
  LlamaModel,
  MLflowPromptVersion,
  ExternalVectorStoreSummary,
  VectorStore,
} from '~/app/types';
import type { GenAiAPIs } from '~/app/types';
import { MCPServerFromAPI } from '~/app/types/mcp';
import { AgentProfile } from './types';

export type AgentProfileValidationContext = {
  playgroundModels: LlamaModel[];
  aiModels: AIModel[];
  mcpServers?: MCPServerFromAPI[];
};

export type AsyncValidationResult = {
  warnings: string[];
  /** The fetched MLflow prompt — present when the profile has a prompt ref and the fetch succeeded. */
  resolvedPrompt?: MLflowPromptVersion;
  /** AA (ConfigMap-backed) vector stores fetched during validation. */
  resolvedAAVectorStores?: ExternalVectorStoreSummary[];
  /** Llama Stack inline vector stores fetched during validation. */
  resolvedLlamaVectorStores?: VectorStore[];
};

/**
 * Synchronous validation: checks resources resolvable without API calls.
 * Run immediately after deserialization; results drive the modal warning alert.
 */
export const buildValidationWarnings = (
  profile: AgentProfile,
  { playgroundModels, aiModels, mcpServers = [] }: AgentProfileValidationContext,
): string[] => {
  const { spec } = profile;
  const warnings: string[] = [];

  // Model: warn when the AI Asset model_id couldn't be matched to a running Llama Stack model.
  if (!playgroundModels.find((m) => m.modelId === spec.model.id)) {
    warnings.push(`Model "${spec.model.id}" is no longer available.`);
  }

  // ASR model: warn when the transcription model is no longer in the AI Assets list.
  if (spec.asr?.model?.id && !aiModels.find((m) => m.model_id === spec.asr!.model!.id)) {
    warnings.push(`Transcription model "${spec.asr.model.id}" is no longer available.`);
  }

  // MCP servers: warn for any server key that couldn't be resolved to a known server.
  spec.mcpServers?.forEach((s) => {
    const key = s.serverRef.key ?? s.serverRef.name;
    if (!mcpServers.find((ms) => ms.name === key)) {
      warnings.push(`MCP server "${key}" is no longer available.`);
    }
  });

  return warnings;
};

/**
 * Async validation: fetches resources that require API calls, checks their availability,
 * and returns both warnings and the fetched data so callers don't need to re-fetch.
 */
export const validateAgentProfileAsync: (
  profile: AgentProfile,
  api: GenAiAPIs,
) => Promise<AsyncValidationResult> = async (profile, api) => {
  const { spec } = profile;
  const warnings: string[] = [];
  const result: AsyncValidationResult = { warnings };

  const stores = spec.vectorStores?.stores ?? [];
  const externalKeys = stores.filter((s) => s.storeRef?.key).map((s) => s.storeRef!.key);
  const inlineIds = stores.filter((s) => s.id).map((s) => s.id!);

  const [promptOutcome, aaOutcome, llamaOutcome] = await Promise.allSettled([
    spec.prompt
      ? api.getMLflowPrompt({
          name: spec.prompt.name,
          ...(spec.prompt.version !== undefined ? { version: spec.prompt.version } : {}),
        })
      : Promise.resolve(null),
    externalKeys.length > 0 ? api.getAAVectorStores() : Promise.resolve(null),
    inlineIds.length > 0 ? api.listVectorStores({}) : Promise.resolve(null),
  ]);

  // Prompt
  if (spec.prompt) {
    if (promptOutcome.status === 'fulfilled' && promptOutcome.value) {
      result.resolvedPrompt = promptOutcome.value;
    } else {
      // Covers both rejected promises and fulfilled-with-null (prompt not found).
      warnings.push(`Prompt "${spec.prompt.name}" is no longer available.`);
    }
  }

  // External (ConfigMap-backed) vector stores
  if (aaOutcome.status === 'fulfilled' && aaOutcome.value !== null) {
    const aaStores = Array.isArray(aaOutcome.value) ? aaOutcome.value : [];
    result.resolvedAAVectorStores = aaStores;
    externalKeys.forEach((key) => {
      if (!aaStores.find((s) => s.vector_store_id === key)) {
        warnings.push(`Vector store "${key}" is no longer available.`);
      }
    });
  }

  // Inline (Llama Stack) vector stores
  if (llamaOutcome.status === 'fulfilled' && llamaOutcome.value !== null) {
    const llamaStores = Array.isArray(llamaOutcome.value) ? llamaOutcome.value : [];
    result.resolvedLlamaVectorStores = llamaStores;
    inlineIds.forEach((id) => {
      if (!llamaStores.find((s) => s.id === id)) {
        warnings.push(`Vector store "${id}" is no longer available.`);
      }
    });
  }

  return result;
};
