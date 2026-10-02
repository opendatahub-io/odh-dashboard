package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient/bffmocks"
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
	for _, tt := range []struct {
		name         string
		allowedTools *[]string
	}{
		{name: "populated", allowedTools: &[]string{"search_code"}},
		{name: "explicitly empty", allowedTools: &[]string{}},
		{name: "omitted"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			profile := &models.AgentProfile{Spec: models.AgentProfileSpec{MCPServers: []models.MCPServerReference{{
				ServerRef:    &models.MCPServerRef{Kind: "ConfigMap", Name: constants.MCPServerName, Key: "GitHub-MCP-Server"},
				AllowedTools: tt.allowedTools,
			}}}}

			servers, err := app.resolveSandboxMCPServers(
				context.Background(), "test-namespace", k8sClient, profile,
				map[string]string{"GitHub-MCP-Server": "Bearer deployment-token"},
			)
			require.NoError(t, err)
			require.Len(t, servers, 1)
			require.Equal(t, "GitHub-MCP-Server", servers[0].ServerLabel)
			require.Equal(t, "https://api.githubcopilot.com/mcp/x/repos/readonly", servers[0].ServerURL)
			require.Equal(t, "MCP_AUTH_1", servers[0].AuthorizationEnvVar)

			if tt.allowedTools == nil {
				require.Nil(t, servers[0].AllowedTools)
				return
			}
			require.NotNil(t, servers[0].AllowedTools)
			require.Equal(t, *tt.allowedTools, *servers[0].AllowedTools)
		})
	}
}

func TestResolveSandboxMCPServersUsesConfigMapAndRegistryReferences(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	serverConfig, err := json.Marshal(models.MCPServerConfig{
		URL:       "https://api.githubcopilot.com/mcp/x/repos/readonly",
		Transport: "streamable-http",
	})
	require.NoError(t, err)
	k8sClient := &kubernetes.TokenKubernetesClient{
		Client: fake.NewClientBuilder().WithObjects(&corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{Namespace: "redhat-ods-applications", Name: constants.MCPServerName},
			Data:       map[string]string{"GitHub-MCP-Server": string(serverConfig)},
		}).Build(),
		Logger: logger,
	}
	app := &App{
		logger:             logger,
		dashboardNamespace: "redhat-ods-applications",
		repositories:       repositories.NewRepositoriesWithMCP(nil, logger),
	}
	profile := &models.AgentProfile{Spec: models.AgentProfileSpec{MCPServers: []models.MCPServerReference{{
		ServerRef: &models.MCPServerRef{Kind: "ConfigMap", Name: constants.MCPServerName, Key: "GitHub-MCP-Server"},
	}, {
		Name: "com.example/github", Source: "mlflow", AllowedTools: &[]string{"search_repositories"},
	}}}}
	registryClient := bffmocks.NewMockBFFClient(bffclient.BFFTargetMLflow)
	registryClient.CallHandler = func(_ context.Context, method, path string, _ interface{}, response interface{}) error {
		require.Equal(t, "GET", method)
		require.Equal(t, "/mcp-registry/servers/com.example/github?workspace=test-namespace", path)
		return json.Unmarshal([]byte(`{
			"data": {
				"name": "com.example/github",
				"status": "active",
				"access_endpoints": [{
					"endpoint_url": "https://registry.example.com/mcp",
					"transport_type": "streamable-http"
				}]
			}
		}`), response)
	}
	ctx := context.WithValue(
		context.Background(),
		constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMLflow)),
		registryClient,
	)

	servers, resolveErr := app.resolveSandboxMCPServers(ctx, "test-namespace", k8sClient, profile, map[string]string{
		"com.example/github": "Bearer registry-token",
	})
	require.NoError(t, resolveErr)
	require.Len(t, servers, 2)
	require.Equal(t, "GitHub-MCP-Server", servers[0].ServerLabel)
	require.Empty(t, servers[0].AuthorizationEnvVar)
	require.Equal(t, "com.example/github", servers[1].ServerLabel)
	require.Equal(t, "https://registry.example.com/mcp", servers[1].ServerURL)
	require.Equal(t, []string{"search_repositories"}, *servers[1].AllowedTools)
	require.Equal(t, "MCP_AUTH_2", servers[1].AuthorizationEnvVar)
}

func TestResolveSandboxMCPServersRejectsAuthForUnselectedServer(t *testing.T) {
	app := &App{}
	profile := &models.AgentProfile{}

	_, err := app.resolveSandboxMCPServers(
		context.Background(), "test-namespace", nil, profile, map[string]string{"GitHub-MCP-Server": "Bearer deployment-token"},
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
		ServerRef: &models.MCPServerRef{Kind: "ConfigMap", Name: constants.MCPServerName, Key: "GitHub-MCP-Server"},
	}}}}

	_, err := app.resolveSandboxMCPServers(context.Background(), "test-namespace", k8sClient, profile, nil)

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
