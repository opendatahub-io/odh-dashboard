package agents

import "os"

const (
	LabelAgentType        = "opendatahub.io/agent-type"
	LabelWorkloadType     = "opendatahub.io/workload-type"
	AnnotationDescription = "opendatahub.io/agent-description"
	LabelProtocolPrefix   = "protocol.opendatahub.io/"

	AnnotationProtocol  = "opendatahub.io/agent-protocol"
	AnnotationFramework = "opendatahub.io/agent-framework"
	AnnotationImageRef  = "opendatahub.io/agent-image"

	AgentTypeAgent = "agent"

	WorkloadTypeSandbox = "sandbox"
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

func A2AAgentCardPath() string {
	return configuredA2AAgentCardPath
}

func DefaultSpiffeTrustDomain() string {
	return configuredSpiffeTrustDomain
}
