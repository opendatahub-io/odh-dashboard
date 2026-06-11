package constants

// Media type identifiers used by the /lsd/files/media endpoint.
const (
	MediaTypeVision = "vision"
	MediaTypeAudio  = "audio"
)

// MediaConfig holds per-type validation rules for the media upload endpoint.
type MediaConfig struct {
	AllowedMIME map[string]bool
	MaxBodySize int64
	OGXPurpose  string
}

// MediaTypeConfigs maps each supported media type to its validation config.
var MediaTypeConfigs = map[string]MediaConfig{
	MediaTypeVision: {
		AllowedMIME: map[string]bool{
			"image/jpeg": true,
			"image/png":  true,
		},
		MaxBodySize: VisionUploadMaxBodySize,
		OGXPurpose:  "vision",
	},
	MediaTypeAudio: {
		AllowedMIME: map[string]bool{
			"audio/wav":  true,
			"audio/mpeg": true,
		},
		MaxBodySize: AudioUploadMaxBodySize,
		OGXPurpose:  "user_data",
	},
}

// SupportedMediaTypes returns a slice of all supported type values (for error messages).
func SupportedMediaTypes() []string {
	types := make([]string, 0, len(MediaTypeConfigs))
	for t := range MediaTypeConfigs {
		types = append(types, t)
	}
	return types
}
