package kubernetes

import "context"

// AgentCardEnrichmentAccess reports which optional card enrichment sources the caller may read.
type AgentCardEnrichmentAccess struct {
	Routes     bool
	MCPServers bool
}

const (
	mcpEnrichmentAPIGroup            = "mcp.kuadrant.io"
	legacyMCPEnrichmentAPIGroup      = "mcp.kagenti.com"
	openshiftRouteEnrichmentGroup    = "route.openshift.io"
	openshiftRouteEnrichmentResource = "routes"
	mcpServerRegistrationResource    = "mcpserverregistrations"
)

// CanAccessAgentCardEnrichment checks SAR/SSAR for Route reads used by card enrichment.
// MCPServers is always false until per-agent MCP linking is defined.
func (kc *InternalKubernetesClient) CanAccessAgentCardEnrichment(
	ctx context.Context,
	identity *RequestIdentity,
	namespace string,
) (AgentCardEnrichmentAccess, error) {
	access := AgentCardEnrichmentAccess{}

	routes, err := kc.subjectAccessReviewGroup(ctx, identity, namespace, "", openshiftRouteEnrichmentGroup, openshiftRouteEnrichmentResource, "list")
	if err != nil {
		return access, err
	}
	access.Routes = routes

	return access, nil
}

func (kc *TokenKubernetesClient) CanAccessAgentCardEnrichment(
	ctx context.Context,
	_ *RequestIdentity,
	namespace string,
) (AgentCardEnrichmentAccess, error) {
	access := AgentCardEnrichmentAccess{}

	routes, err := kc.selfSubjectAccessReviewGroup(ctx, namespace, "", openshiftRouteEnrichmentGroup, openshiftRouteEnrichmentResource, "list")
	if err != nil {
		return access, err
	}
	access.Routes = routes

	return access, nil
}
