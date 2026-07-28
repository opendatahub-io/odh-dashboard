package constants

import "k8s.io/apimachinery/pkg/runtime/schema"

const (
	PlatformCollectorName = "data-science-collector"
	GenAICollectorName    = "gen-ai-trace-collector"

	OTelCollectorGroup    = "opentelemetry.io"
	OTelCollectorVersion  = "v1beta1"
	OTelCollectorResource = "opentelemetrycollectors"
)

var OTelCollectorGVR = schema.GroupVersionResource{
	Group:    OTelCollectorGroup,
	Version:  OTelCollectorVersion,
	Resource: OTelCollectorResource,
}
