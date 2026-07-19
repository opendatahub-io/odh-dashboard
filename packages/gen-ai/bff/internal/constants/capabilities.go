package constants

// Model capability annotation key and recognized capability values.
const (
	ModelCapabilitiesAnnotationKey = "opendatahub.io/model-capabilities"

	CapabilityVision             = "vision"
	CapabilityAudioTranscription = "audio-transcription"
	CapabilityTextGeneration     = "text-generation"
)

// knownCapabilities is the set of capability values the BFF has behavioral logic for.
// Used for behavioral gating (e.g., ASR resolution, vision upload), NOT for filtering.
var knownCapabilities = map[string]bool{
	CapabilityVision:             true,
	CapabilityAudioTranscription: true,
	CapabilityTextGeneration:     true,
}

// IsKnownCapability reports whether the BFF has specific behavioral logic for this capability
// (e.g., ASR resolution, vision upload gating). Does NOT imply unknown capabilities are invalid.
func IsKnownCapability(capability string) bool {
	return knownCapabilities[capability]
}

// defaultCapabilities is the internal default set.
var defaultCapabilities = []string{CapabilityTextGeneration}

// DefaultCapabilities returns a copy of the default capability set.
func DefaultCapabilities() []string {
	return append([]string{}, defaultCapabilities...)
}

// IsASROnlyCapabilities returns true when the capability set contains audio-transcription
// but NOT text-generation. These models are speech-to-text only and should not have
// text-generation injected.
func IsASROnlyCapabilities(caps []string) bool {
	hasASR := false
	hasTextGen := false
	for _, c := range caps {
		switch c {
		case CapabilityAudioTranscription:
			hasASR = true
		case CapabilityTextGeneration:
			hasTextGen = true
		}
	}
	return hasASR && !hasTextGen
}

// HasASRCapability returns true if the capability list includes audio-transcription.
func HasASRCapability(caps []string) bool {
	for _, c := range caps {
		if c == CapabilityAudioTranscription {
			return true
		}
	}
	return false
}

// InferModelTypeFromCapabilities returns "transcription" if the capabilities
// indicate an ASR-only model, empty string otherwise (caller keeps existing type).
func InferModelTypeFromCapabilities(caps []string) string {
	if IsASROnlyCapabilities(caps) {
		return "transcription"
	}
	return ""
}

// BuildCapabilities deduplicates and ensures text-generation is present for non-ASR models.
// For ASR-only models (have audio-transcription but not text-generation), text-generation
// is NOT injected since these models cannot generate text.
// All capabilities pass through (no allowlist filtering).
// Returns nil when input is empty so the YAML field is omitted and the read-path default applies.
func BuildCapabilities(input []string) []string {
	if len(input) == 0 {
		return nil
	}

	seen := make(map[string]bool, len(input))
	hasTextGen := false
	hasASR := false
	hasVision := false
	result := make([]string, 0, len(input)+1)
	for _, cap := range input {
		if seen[cap] {
			continue
		}
		seen[cap] = true
		switch cap {
		case CapabilityTextGeneration:
			hasTextGen = true
		case CapabilityAudioTranscription:
			hasASR = true
		case CapabilityVision:
			hasVision = true
		}
		result = append(result, cap)
	}

	if len(result) == 0 {
		return nil
	}

	// Suppress text-generation only for pure ASR models (audio-transcription
	// without vision or other capabilities that imply text generation).
	// Multimodal models with both ASR and vision still need text-generation.
	isASROnly := hasASR && !hasVision
	if !hasTextGen && !isASROnly {
		result = append([]string{CapabilityTextGeneration}, result...)
	}

	return result
}
