package repositories

import (
	"testing"

	"github.com/kubeflow/hub/ui/bff/internal/models"
)

func TestMcpGatewayHostnameUsesListenerWildcard(t *testing.T) {
	if got := mcpGatewayHostname("weather", "*.mcp.example.com"); got != "weather.mcp.example.com" {
		t.Fatalf("unexpected wildcard hostname: %q", got)
	}
}

func TestMcpGatewayHostnameUsesDefault(t *testing.T) {
	if got := mcpGatewayHostname("weather", ""); got != "weather.mcp.local" {
		t.Fatalf("unexpected default hostname: %q", got)
	}
}

func TestBuildMcpGatewayResources(t *testing.T) {
	target := mcpGatewayTarget{
		name:      "mcp-gateway",
		namespace: "mcp-gateway-system",
		listener:  "mcps",
		hostname:  "*.mcp.local",
	}
	route := buildMcpGatewayHTTPRoute(
		"weather-route", target, "weather.mcp.local", "team-a", "weather", 8080,
		map[string]string{mcpPrerequisiteManagedByLabel: mcpPrerequisiteManager},
	)
	if !mcpGatewayHTTPRouteMatches(route, target, "weather.mcp.local", "team-a", "weather", 8080) {
		t.Fatal("expected generated HTTPRoute to match its target")
	}

	registration := buildMcpServerRegistration("weather", "weather-route", &models.McpGatewayRegistration{
		Category: []string{"mcp"},
		Hint:     "Weather tools",
		Path:     "/mcp",
		Tags:     []string{"evaluation"},
	}, map[string]string{mcpPrerequisiteManagedByLabel: mcpPrerequisiteManager})
	if !mcpServerRegistrationMatches(registration, "weather-route") {
		t.Fatal("expected generated registration to target its HTTPRoute")
	}
}
