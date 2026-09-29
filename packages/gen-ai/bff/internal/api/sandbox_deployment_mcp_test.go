package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	kubernetes "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestResolveSandboxMCPServersUsesDashboardConfigAndDeploymentAuth(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	serverConfig, err := json.Marshal(models.MCPServerConfig{
		URL:       "https://api.githubcopilot.com/mcp/x/repos/readonly",
		Transport: "streamable-http",
	})
	require.NoError(t, err)

	dashboardConfig := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{Namespace: "redhat-ods-applications", Name: constants.MCPServerName},
		Data:       map[string]string{"GitHub-MCP-Server": string(serverConfig)},
	}
	k8sClient := &kubernetes.TokenKubernetesClient{
		Client: fake.NewClientBuilder().WithObjects(dashboardConfig).Build(),
		Logger: logger,
	}
	app := &App{
		logger:             logger,
		dashboardNamespace: "redhat-ods-applications",
		repositories:       repositories.NewRepositoriesWithMCP(nil, logger),
	}
	profile := &models.AgentProfile{Spec: models.AgentProfileSpec{MCPServers: []models.MCPServerReference{{
		ServerRef:    models.MCPServerRef{Kind: "ConfigMap", Name: constants.MCPServerName, Key: "GitHub-MCP-Server"},
		AllowedTools: []string{"search_code"},
	}}}}

	servers, err := app.resolveSandboxMCPServers(
		context.Background(), k8sClient, profile, map[string]string{"GitHub-MCP-Server": "Bearer deployment-token"},
	)
	require.NoError(t, err)
	require.Len(t, servers, 1)
	require.Equal(t, "GitHub-MCP-Server", servers[0].ServerLabel)
	require.Equal(t, "https://api.githubcopilot.com/mcp/x/repos/readonly", servers[0].ServerURL)
	require.Equal(t, []string{"search_code"}, *servers[0].AllowedTools)
	require.Equal(t, "MCP_AUTH_1", servers[0].AuthorizationEnvVar)
}

func TestResolveSandboxMCPServersRejectsAuthForUnselectedServer(t *testing.T) {
	app := &App{}
	profile := &models.AgentProfile{}

	_, err := app.resolveSandboxMCPServers(
		context.Background(), nil, profile, map[string]string{"GitHub-MCP-Server": "Bearer deployment-token"},
	)
	require.ErrorContains(t, err, "AgentProfile has no MCP servers")
}

func TestResolveSandboxMCPServersClassifiesDashboardConfigReadFailures(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	k8sClient := &kubernetes.TokenKubernetesClient{
		Client: fake.NewClientBuilder().Build(),
		Logger: logger,
	}
	app := &App{
		logger:             logger,
		dashboardNamespace: "redhat-ods-applications",
		repositories:       repositories.NewRepositoriesWithMCP(nil, logger),
	}
	profile := &models.AgentProfile{Spec: models.AgentProfileSpec{MCPServers: []models.MCPServerReference{{
		ServerRef: models.MCPServerRef{Kind: "ConfigMap", Name: constants.MCPServerName, Key: "GitHub-MCP-Server"},
	}}}}

	_, err := app.resolveSandboxMCPServers(context.Background(), k8sClient, profile, nil)

	require.Error(t, err)
	require.ErrorIs(t, err, errSandboxMCPDashboardConfigRead)
}

func TestNormalizeMCPServerAuthStripsBearerScheme(t *testing.T) {
	normalized, err := normalizeMCPServerAuth(map[string]string{
		"GitHub-MCP-Server": "Bearer deployment-token",
	})
	require.NoError(t, err)
	require.Equal(t, "deployment-token", normalized["GitHub-MCP-Server"])
}

func TestNormalizeMCPServerAuthRejectsBearerWithoutToken(t *testing.T) {
	_, err := normalizeMCPServerAuth(map[string]string{"GitHub-MCP-Server": "Bearer "})
	require.ErrorContains(t, err, "cannot be empty")
}
