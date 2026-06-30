package kubernetes

import "context"

// AgentCardEnrichmentAccess reports which optional card enrichment sources the caller may read.
type AgentCardEnrichmentAccess struct {
	AgentRuntime bool
	Routes       bool
	MCPServers   bool
}

var mcpEnrichmentAPIGroups = []string{"mcp.kuadrant.io", "mcp.kagenti.com"}

// CanAccessAgentCardEnrichment checks SAR/SSAR for AgentRuntime, Route, and MCP reads used by card enrichment.
func (kc *InternalKubernetesClient) CanAccessAgentCardEnrichment(
	ctx context.Context,
	identity *RequestIdentity,
	namespace, agentRuntimeName string,
) (AgentCardEnrichmentAccess, error) {
	access := AgentCardEnrichmentAccess{}

	allowedGet, err := kc.subjectAccessReviewGroup(ctx, identity, namespace, agentRuntimeName, agentRuntimeEnrichmentGroup, agentRuntimeEnrichmentResource, "get")
	if err != nil {
		return access, err
	}
	allowedList, err := kc.subjectAccessReviewGroup(ctx, identity, namespace, "", agentRuntimeEnrichmentGroup, agentRuntimeEnrichmentResource, "list")
	if err != nil {
		return access, err
	}
	access.AgentRuntime = allowedGet || allowedList

	access.Routes, err = kc.subjectAccessReviewGroup(ctx, identity, namespace, "", openshiftRouteEnrichmentGroup, openshiftRouteEnrichmentResource, "list")
	if err != nil {
		return access, err
	}

	for _, group := range mcpEnrichmentAPIGroups {
		allowed, err := kc.subjectAccessReviewGroup(ctx, identity, namespace, "", group, mcpServerRegistrationResource, "list")
		if err != nil {
			return access, err
		}
		if allowed {
			access.MCPServers = true
			break
		}
	}

	return access, nil
}

func (kc *TokenKubernetesClient) CanAccessAgentCardEnrichment(
	ctx context.Context,
	_ *RequestIdentity,
	namespace, agentRuntimeName string,
) (AgentCardEnrichmentAccess, error) {
	access := AgentCardEnrichmentAccess{}

	allowedGet, err := kc.selfSubjectAccessReviewGroup(ctx, namespace, agentRuntimeName, agentRuntimeEnrichmentGroup, agentRuntimeEnrichmentResource, "get")
	if err != nil {
		return access, err
	}
	allowedList, err := kc.selfSubjectAccessReviewGroup(ctx, namespace, "", agentRuntimeEnrichmentGroup, agentRuntimeEnrichmentResource, "list")
	if err != nil {
		return access, err
	}
	access.AgentRuntime = allowedGet || allowedList

	access.Routes, err = kc.selfSubjectAccessReviewGroup(ctx, namespace, "", openshiftRouteEnrichmentGroup, openshiftRouteEnrichmentResource, "list")
	if err != nil {
		return access, err
	}

	for _, group := range mcpEnrichmentAPIGroups {
		allowed, err := kc.selfSubjectAccessReviewGroup(ctx, namespace, "", group, mcpServerRegistrationResource, "list")
		if err != nil {
			return access, err
		}
		if allowed {
			access.MCPServers = true
			break
		}
	}

	return access, nil
}

const (
	agentRuntimeEnrichmentGroup      = "agent.kagenti.dev"
	agentRuntimeEnrichmentResource   = "agentruntimes"
	openshiftRouteEnrichmentGroup    = "route.openshift.io"
	openshiftRouteEnrichmentResource = "routes"
	mcpServerRegistrationResource    = "mcpserverregistrations"
)
