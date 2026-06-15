package constants

// Model capability annotation key and recognized capability values.
const (
	ModelCapabilitiesAnnotationKey = "opendatahub.io/model-capabilities"

	CapabilityVision             = "vision"
	CapabilityAudioTranscription = "audio-transcription"
	CapabilityTextGeneration     = "text-generation"
)

// AllowedCapabilities is the set of capability values the BFF recognises.
// Values not in this set are dropped with a structured log warning.
var AllowedCapabilities = map[string]bool{
	CapabilityVision:             true,
	CapabilityAudioTranscription: true,
	CapabilityTextGeneration:     true,
}

// defaultCapabilities is the internal default set.
var defaultCapabilities = []string{CapabilityTextGeneration}

// DefaultCapabilities returns a copy of the default capability set.
func DefaultCapabilities() []string {
	return append([]string{}, defaultCapabilities...)
}
