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

// DefaultCapabilities is returned when an annotation is missing or empty.
// Callers must copy before returning to avoid mutating the package-level slice.
var DefaultCapabilities = []string{CapabilityTextGeneration}
