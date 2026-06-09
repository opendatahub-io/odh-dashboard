package agents

// Kubernetes label and annotation keys used to describe kagenti agent resources.
const (
	LabelAgentType        = "kagenti.io/type"
	LabelWorkloadType     = "kagenti.io/workload-type"
	AnnotationDescription = "kagenti.io/description"

	LabelKagentiEnabled      = "kagenti-enabled"
	LabelKagentiEnabledValue = "true"

	AgentTypeAgent = "agent"

	WorkloadTypeDeployment  = "deployment"
	WorkloadTypeStatefulSet = "statefulset"
	WorkloadTypeJob         = "job"
)
