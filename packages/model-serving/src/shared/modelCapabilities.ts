/**
 * Annotation key for Model Capabilities on InferenceService / LLMInferenceService.
 * Value is a JSON-encoded string array, e.g. `["Vision","Transcription"]`.
 */
export const MODEL_CAPABILITIES_ANNOTATION = 'opendatahub.io/model-capabilities';

/**
 * Hardcoded well-known Model Capability values offered by the dashboard UI.
 * New values can be added here without BFF/CRD changes.
 */
export const WELL_KNOWN_MODEL_CAPABILITIES = ['Vision', 'Transcription'] as const;

export type WellKnownModelCapability = (typeof WELL_KNOWN_MODEL_CAPABILITIES)[number];

/** Any capability string, including well-known and custom values. */
export type ModelCapability = string;
