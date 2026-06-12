package agents

// Kubernetes label and annotation keys used to describe agent resources.
// Centralize here so mock data, mappers, and future client-go integrations stay aligned.
const (
	LabelAgentType           = "opendatahub.io/agent-type"
	AnnotationDescription    = "opendatahub.io/description"
	AnnotationDescriptionAlt = "description"
)
