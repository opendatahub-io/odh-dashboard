package repositories

import (
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/kubeflow/hub/ui/bff/internal/models"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
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
		Prefix:   "weather_",
		Path:     "/mcp",
		Tags:     []string{"evaluation"},
	}, map[string]string{mcpPrerequisiteManagedByLabel: mcpPrerequisiteManager})
	if !mcpServerRegistrationMatches(registration, "weather-route") {
		t.Fatal("expected generated registration to target its HTTPRoute")
	}
	prefix, found, err := unstructured.NestedString(registration.Object, "spec", "prefix")
	if err != nil || !found || prefix != "weather_" {
		t.Fatalf("expected generated registration prefix, got %q err=%v found=%v", prefix, err, found)
	}
	grant := buildMcpGatewayReferenceGrant(
		mcpGatewayReferenceGrantName("weather"),
		"team-a",
		"mcp-gateway-system",
		nil,
	)
	if !mcpGatewayReferenceGrantMatches(grant, "mcp-gateway-system") {
		t.Fatal("expected generated ReferenceGrant to allow the Gateway namespace")
	}
}

func TestBuildMcpServerRegistrationBoundsHint(t *testing.T) {
	registration := buildMcpServerRegistration("weather", "weather-route", &models.McpGatewayRegistration{
		Hint: strings.Repeat("界", 200),
	}, nil)

	hint, found, err := unstructured.NestedString(registration.Object, "spec", "hint")
	if err != nil || !found {
		t.Fatalf("expected registration hint, got err=%v found=%v", err, found)
	}
	if len(hint) > mcpGatewayHintMaxBytes || !utf8.ValidString(hint) {
		t.Fatalf("expected valid hint no longer than %d bytes, got %d bytes", mcpGatewayHintMaxBytes, len(hint))
	}
}
