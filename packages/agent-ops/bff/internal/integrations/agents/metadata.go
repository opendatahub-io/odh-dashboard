package agents

import "os"

// Kubernetes label and annotation keys used to describe kagenti agent resources.
const (
	LabelAgentType        = "kagenti.io/type"
	LabelWorkloadType     = "kagenti.io/workload-type"
	AnnotationDescription = "kagenti.io/description"
	LabelProtocolPrefix   = "protocol.kagenti.io/"

	LabelKagentiEnabled      = "kagenti-enabled"
	LabelKagentiEnabledValue = "true"

	AgentTypeAgent = "agent"

	WorkloadTypeDeployment  = "deployment"
	WorkloadTypeStatefulSet = "statefulset"
	WorkloadTypeJob         = "job"
)

// A2AAgentCardPath is the default in-cluster/public path suffix for A2A agent card discovery.
// Override with AGENT_OPS_A2A_AGENT_CARD_PATH.
var A2AAgentCardPath = "/.well-known/agent-card.json"

// DefaultSpiffeTrustDomain is the default SPIFFE trust domain when none is attested on the card.
// Override with AGENT_OPS_SPIFFE_TRUST_DOMAIN.
var DefaultSpiffeTrustDomain = "cluster.local"

func init() {
	if value := os.Getenv("AGENT_OPS_A2A_AGENT_CARD_PATH"); value != "" {
		A2AAgentCardPath = value
	}
	if value := os.Getenv("AGENT_OPS_SPIFFE_TRUST_DOMAIN"); value != "" {
		DefaultSpiffeTrustDomain = value
	}
}
