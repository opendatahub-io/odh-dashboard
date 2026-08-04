package models

// NamespaceApplicationCase determines which labels/annotations to apply to a namespace.
type NamespaceApplicationCase int

const (
	DSGCreation               NamespaceApplicationCase = 0
	KServePromotion           NamespaceApplicationCase = 1
	KServeNIMPromotion        NamespaceApplicationCase = 2
	ResetModelServingPlatform NamespaceApplicationCase = 3
)

const (
	LabelModelMeshEnabled = "modelmesh-enabled"
	AnnotationNIMSupport  = "opendatahub.io/nim-support"
)

// NamespaceMutationResponse is the response for namespace serving platform mutations.
type NamespaceMutationResponse struct {
	Applied bool `json:"applied"`
}
