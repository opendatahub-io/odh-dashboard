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

export type ModelCapabilityLabelColor = 'blue' | 'orange' | 'grey';

const WELL_KNOWN_CAPABILITY_COLORS: Record<WellKnownModelCapability, ModelCapabilityLabelColor> = {
  Vision: 'blue',
  Transcription: 'orange',
};

export const resolveWellKnownModelCapability = (
  capability: string,
): WellKnownModelCapability | undefined =>
  WELL_KNOWN_MODEL_CAPABILITIES.find(
    (wellKnown) => wellKnown.toLowerCase() === capability.toLowerCase(),
  );

export const getModelCapabilityLabelColor = (capability: string): ModelCapabilityLabelColor => {
  const wellKnown = resolveWellKnownModelCapability(capability);
  if (wellKnown) {
    return WELL_KNOWN_CAPABILITY_COLORS[wellKnown];
  }
  return 'grey';
};

/**
 * Parse the JSON-string-array annotation value from a K8s resource's annotations.
 * Returns undefined when the annotation is absent or malformed.
 */
export const parseModelCapabilities = (
  annotations?: Record<string, string>,
): string[] | undefined => {
  const raw = annotations?.[MODEL_CAPABILITIES_ANNOTATION];
  if (!raw) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
      return parsed;
    }
  } catch {
    // malformed annotation — treat as absent
  }
  return undefined;
};
