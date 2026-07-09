package kubernetes

import "context"

// AgentCardEnrichmentAccess reports which optional card enrichment sources the caller may read.
type AgentCardEnrichmentAccess struct {
	Routes     bool
	MCPServers bool
}

const (
	mcpEnrichmentAPIGroup            = "mcp.kuadrant.io"
	openshiftRouteEnrichmentGroup    = "route.openshift.io"
	openshiftRouteEnrichmentResource = "routes"
	mcpServerRegistrationResource    = "mcpserverregistrations"
)

// CanAccessAgentCardEnrichment checks SAR/SSAR for Route and MCP reads used by card enrichment.
func (kc *InternalKubernetesClient) CanAccessAgentCardEnrichment(
	ctx context.Context,
	identity *RequestIdentity,
	namespace string,
) (AgentCardEnrichmentAccess, error) {
	access := AgentCardEnrichmentAccess{}
	var err error

	access.Routes, err = kc.subjectAccessReviewGroup(ctx, identity, namespace, "", openshiftRouteEnrichmentGroup, openshiftRouteEnrichmentResource, "list")
	if err != nil {
		return access, err
	}

	access.MCPServers, err = kc.subjectAccessReviewGroup(ctx, identity, namespace, "", mcpEnrichmentAPIGroup, mcpServerRegistrationResource, "list")
	if err != nil {
		return access, err
	}

	return access, nil
}

func (kc *TokenKubernetesClient) CanAccessAgentCardEnrichment(
	ctx context.Context,
	_ *RequestIdentity,
	namespace string,
) (AgentCardEnrichmentAccess, error) {
	access := AgentCardEnrichmentAccess{}
	var err error

	access.Routes, err = kc.selfSubjectAccessReviewGroup(ctx, namespace, "", openshiftRouteEnrichmentGroup, openshiftRouteEnrichmentResource, "list")
	if err != nil {
		return access, err
	}

	access.MCPServers, err = kc.selfSubjectAccessReviewGroup(ctx, namespace, "", mcpEnrichmentAPIGroup, mcpServerRegistrationResource, "list")
	if err != nil {
		return access, err
	}

	return access, nil
}
