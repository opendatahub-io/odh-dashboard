package constants

// Model capability annotation key and recognized capability values.
const (
	ModelCapabilitiesAnnotationKey = "opendatahub.io/model-capabilities"

	CapabilityVision             = "vision"
	CapabilityAudioTranscription = "audio-transcription"
	CapabilityTextGeneration     = "text-generation"
)

// allowedCapabilities is the set of capability values the BFF recognises.
var allowedCapabilities = map[string]bool{
	CapabilityVision:             true,
	CapabilityAudioTranscription: true,
	CapabilityTextGeneration:     true,
}

// IsAllowedCapability reports whether the given capability string is recognised.
func IsAllowedCapability(capability string) bool {
	return allowedCapabilities[capability]
}

// defaultCapabilities is the internal default set.
var defaultCapabilities = []string{CapabilityTextGeneration}

// DefaultCapabilities returns a copy of the default capability set.
func DefaultCapabilities() []string {
	return append([]string{}, defaultCapabilities...)
}

// BuildCapabilities filters the input through the allowlist and ensures
// text-generation is always present. Returns nil when input is empty so
// the YAML field is omitted and the read-path default applies.
func BuildCapabilities(input []string) []string {
	if len(input) == 0 {
		return nil
	}

	seen := make(map[string]bool, len(input))
	hasTextGen := false
	result := make([]string, 0, len(input)+1)
	for _, cap := range input {
		if !IsAllowedCapability(cap) || seen[cap] {
			continue
		}
		seen[cap] = true
		if cap == CapabilityTextGeneration {
			hasTextGen = true
		}
		result = append(result, cap)
	}

	if len(result) == 0 {
		return nil
	}

	if !hasTextGen {
		result = append([]string{CapabilityTextGeneration}, result...)
	}

	return result
}
