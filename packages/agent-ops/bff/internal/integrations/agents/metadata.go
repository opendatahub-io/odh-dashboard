package agents

import (
	"os"
)

const (
	LabelAgentType        = "opendatahub.io/agent-type"
	LabelWorkloadType     = "opendatahub.io/workload-type"
	AnnotationDisplayName = "openshift.io/display-name"
	AnnotationDescription = "openshift.io/description"
	LabelProtocolPrefix   = "protocol.opendatahub.io/"

	AnnotationProtocol  = "opendatahub.io/agent-protocol"
	AnnotationFramework = "opendatahub.io/agent-framework"
	AnnotationImageRef  = "opendatahub.io/agent-image"

	LabelOpenShellManagedBy = "openshell.ai/managed-by"
	OpenShellManagedByValue = "openshell"
	LabelOpenShellSandboxID = "openshell.ai/sandbox-id"

	AgentTypeAgent = "agent"

	WorkloadTypeSandbox = "sandbox"
)

// ResolveAgentResourceType returns the agent resource type from sandbox labels.
// Discovery is OpenShell-only; sandboxes with openshell.ai/managed-by=openshell are agents.
func ResolveAgentResourceType(labels map[string]string) string {
	if labels[LabelOpenShellManagedBy] == OpenShellManagedByValue {
		return AgentTypeAgent
	}
	return ""
}

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
