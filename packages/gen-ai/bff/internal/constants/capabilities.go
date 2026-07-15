package constants

// Model capability annotation key and recognized capability values.
const (
	ModelCapabilitiesAnnotationKey = "opendatahub.io/model-capabilities"

	CapabilityVision             = "vision"
	CapabilityAudioTranscription = "audio-transcription"
	CapabilityTextGeneration     = "text-generation"
)

// knownCapabilities is the set of capability values the BFF has behavioral logic for.
// Used only for normalization decisions, NOT for filtering — all capabilities pass through.
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

// capabilityAliases maps alternate capability names to canonical gen-ai names.
var capabilityAliases = map[string]string{
	"image-text-inferencing":   CapabilityVision,
	"audio-speech-recognition": CapabilityAudioTranscription,
}

// NormalizeCapability maps any known capability alias to the gen-ai canonical name.
// Works for both MaaS aliases and custom endpoint ConfigMap values.
func NormalizeCapability(cap string) string {
	if mapped, ok := capabilityAliases[cap]; ok {
		return mapped
	}
	return cap
}

// defaultCapabilities is the internal default set.
var defaultCapabilities = []string{CapabilityTextGeneration}

// DefaultCapabilities returns a copy of the default capability set.
func DefaultCapabilities() []string {
	return append([]string{}, defaultCapabilities...)
}

// BuildCapabilities normalizes aliases, deduplicates, and ensures text-generation
// is always present. All capabilities pass through (no allowlist filtering).
// Returns nil when input is empty so the YAML field is omitted and the read-path default applies.
func BuildCapabilities(input []string) []string {
	if len(input) == 0 {
		return nil
	}

	seen := make(map[string]bool, len(input))
	hasTextGen := false
	result := make([]string, 0, len(input)+1)
	for _, cap := range input {
		normalized := NormalizeCapability(cap)
		if seen[normalized] {
			continue
		}
		seen[normalized] = true
		if normalized == CapabilityTextGeneration {
			hasTextGen = true
		}
		result = append(result, normalized)
	}

	if len(result) == 0 {
		return nil
	}

	if !hasTextGen {
		result = append([]string{CapabilityTextGeneration}, result...)
	}

	return result
}
