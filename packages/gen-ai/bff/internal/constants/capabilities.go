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
