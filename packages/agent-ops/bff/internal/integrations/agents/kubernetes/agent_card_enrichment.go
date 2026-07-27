package kubernetes

import (
	"context"
	"log/slog"
	"strings"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
)

func (c *Client) enrichAgentCard(ctx context.Context, namespace, name string, detail *agents.AgentDetail) {
	if detail == nil {
		return
	}

	detail.ServiceAccountName = serviceAccountFromSpec(detail.Spec)

	dynamicClient, err := c.k8sClient.DynamicClient()
	if err != nil {
		c.logger.Warn("skipping agent card enrichment; dynamic client unavailable",
			slog.String("namespace", namespace),
			slog.String("name", name),
			slog.Any("error", err))
		return
	}

	access, err := c.k8sClient.CanAccessAgentCardEnrichment(ctx, c.identity, namespace)
	if err != nil {
		c.logger.Warn("skipping agent card enrichment; enrichment access check failed",
			slog.String("namespace", namespace),
			slog.String("name", name),
			slog.Any("error", err))
		return
	}

	serviceName := agentServiceName(detail, name)

	var externalURL string
	if access.Routes {
		externalURL = findExternalAgentCardURL(ctx, dynamicClient, c.logger, namespace, serviceName)
	}

	// Per-agent MCP linking is not defined yet; omit toolConnections until a spec exists.
	applyAgentCardEnrichment(detail, externalURL, nil)
}

func agentServiceName(detail *agents.AgentDetail, workloadName string) string {
	if detail != nil && detail.Service != nil && strings.TrimSpace(detail.Service.Name) != "" {
		return detail.Service.Name
	}
	return workloadName
}

func applyAgentCardEnrichment(detail *agents.AgentDetail, externalURL string, toolConnections []string) {
	if detail == nil {
		return
	}

	externalURL = agents.SanitizeHTTPURL(externalURL)
	if detail.AgentCard == nil {
		if externalURL == "" && len(toolConnections) == 0 {
			return
		}
		detail.AgentCard = &agents.AgentCardObserved{}
	}

	sanitizeObservedCardURLs(detail.AgentCard)
	detail.AgentCard.ExternalAgentCardURL = externalURL
	detail.AgentCard.ToolConnections = toolConnections
}

func sanitizeObservedCardURLs(card *agents.AgentCardObserved) {
	if card == nil {
		return
	}
	card.URL = agents.SanitizeHTTPURL(card.URL)
	card.DocumentationURL = agents.SanitizeHTTPURL(card.DocumentationURL)
	card.IconURL = agents.SanitizeHTTPURL(card.IconURL)
	card.ProviderURL = agents.SanitizeHTTPURL(card.ProviderURL)
	for i := range card.Extensions {
		card.Extensions[i].URI = agents.SanitizeResourceURI(card.Extensions[i].URI)
	}
}

func serviceAccountFromSpec(spec map[string]any) string {
	if spec == nil {
		return ""
	}
	for _, templateKey := range []string{"podTemplate", "template"} {
		template, ok := spec[templateKey].(map[string]any)
		if !ok {
			continue
		}
		podSpec, ok := template["spec"].(map[string]any)
		if !ok {
			continue
		}
		if sa := strings.TrimSpace(stringField(podSpec["serviceAccountName"])); sa != "" {
			return sa
		}
	}
	return ""
}

func stringField(value any) string {
	switch v := value.(type) {
	case string:
		return strings.TrimSpace(v)
	default:
		return ""
	}
}
