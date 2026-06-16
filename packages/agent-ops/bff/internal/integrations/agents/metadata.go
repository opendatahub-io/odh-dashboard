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

const (
	defaultA2AAgentCardPath  = "/.well-known/agent-card.json"
	defaultSpiffeTrustDomain = "cluster.local"
	envA2AAgentCardPath      = "AGENT_OPS_A2A_AGENT_CARD_PATH"
	envSpiffeTrustDomain     = "AGENT_OPS_SPIFFE_TRUST_DOMAIN"
)

var (
	configuredA2AAgentCardPath  = defaultA2AAgentCardPath
	configuredSpiffeTrustDomain = defaultSpiffeTrustDomain
)

func init() {
	if value := os.Getenv(envA2AAgentCardPath); value != "" {
		configuredA2AAgentCardPath = value
	}
	if value := os.Getenv(envSpiffeTrustDomain); value != "" {
		configuredSpiffeTrustDomain = value
	}
}

// A2AAgentCardPath returns the configured in-cluster/public path suffix for A2A agent card discovery.
func A2AAgentCardPath() string {
	return configuredA2AAgentCardPath
}

// DefaultSpiffeTrustDomain returns the configured SPIFFE trust domain when none is attested on the card.
func DefaultSpiffeTrustDomain() string {
	return configuredSpiffeTrustDomain
}
