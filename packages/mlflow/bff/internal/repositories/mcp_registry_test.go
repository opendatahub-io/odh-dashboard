package repositories

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/opendatahub-io/mlflow-go/mlflow/mcpregistry"
	"github.com/stretchr/testify/assert"
	tmock "github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	mlflowpkg "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
	"github.com/opendatahub-io/mlflow/bff/internal/models"
)

// --- buildTagFilter / combineFilters ---

func TestBuildTagFilter(t *testing.T) {
	assert.Equal(t, "", buildTagFilter(""))
	assert.Equal(t, "", buildTagFilter("nokey"))
	assert.Equal(t, "tags.`category` = 'weather'", buildTagFilter("category=weather"))
	assert.Equal(t, "tags.`category` = 'weather=cold'", buildTagFilter("category=weather=cold"))
	assert.Equal(t, "tags.`category` = 'it\\'s cold'", buildTagFilter("category=it's cold"))
	// MLflow's own tag-name validation (validate_param_and_metric_name)
	// allows slashes, colons, and spaces, so validTagKey must too, or valid
	// tags silently stop filtering instead of erroring.
	assert.Equal(t, "tags.`team/category` = 'weather'", buildTagFilter("team/category=weather"))
	assert.Equal(t, "tags.`mlflow:parent` = 'run-1'", buildTagFilter("mlflow:parent=run-1"))
	assert.Equal(t, "tags.`my key` = 'v'", buildTagFilter("my key=v"))
	// A backtick in the key is rejected outright (not in validTagKey's
	// allowlist, and MLflow's own validation disallows it too).
	assert.Equal(t, "", buildTagFilter("a`b=weather"))
	// A value ending in a lone backslash must not turn the closing quote
	// into an escaped (and thus non-terminating) literal quote: the
	// backslash itself must be escaped first, so the output ends in an
	// escaped backslash followed by a real closing quote.
	assert.Equal(t, "tags.`k` = 'x\\\\'", buildTagFilter(`k=x\`))
}

func TestCombineFilters(t *testing.T) {
	combined, err := combineFilters("", "")
	require.NoError(t, err)
	assert.Equal(t, "", combined)

	combined, err = combineFilters("a", "")
	require.NoError(t, err)
	assert.Equal(t, "(a)", combined)

	combined, err = combineFilters("a", "b")
	require.NoError(t, err)
	assert.Equal(t, "(a) AND (b)", combined)

	// A boolean operator inside one fragment must not escape its own
	// parens and change precedence relative to the other fragment.
	combined, err = combineFilters("1=1 OR 1=1", "tags.`k` = 'v'")
	require.NoError(t, err)
	assert.Equal(t, "(1=1 OR 1=1) AND (tags.`k` = 'v')", combined)

	// A fragment with unbalanced parens (e.g. an unmatched ")") would close
	// the wrapping "(" early and let a boolean operator escape into the
	// next fragment anyway, reintroducing the precedence bug the wrapping
	// is meant to prevent — so such a fragment must be rejected outright
	// rather than silently wrapped.
	_, err = combineFilters("1=1) OR (1=1", "tags.`k` = 'v'")
	assert.ErrorIs(t, err, ErrInvalidFilter)

	_, err = combineFilters("(1=1", "")
	assert.ErrorIs(t, err, ErrInvalidFilter)

	_, err = combineFilters("1=1)", "")
	assert.ErrorIs(t, err, ErrInvalidFilter)
}

func TestHasBalancedParens(t *testing.T) {
	assert.True(t, hasBalancedParens(""))
	assert.True(t, hasBalancedParens("1=1"))
	assert.True(t, hasBalancedParens("(1=1 OR 1=1)"))
	assert.True(t, hasBalancedParens("(a) AND (b)"))
	assert.False(t, hasBalancedParens("(1=1"))
	assert.False(t, hasBalancedParens("1=1)"))
	assert.False(t, hasBalancedParens("1=1) OR (1=1"))
}

// --- SearchServers ---

func TestSearchServersSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	now := time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC)

	mockClient.On("SearchMCPServers", tmock.Anything, tmock.MatchedBy(func(opts []mcpregistry.SearchMCPServersOption) bool {
		return len(opts) == 0
	})).Return(&mcpregistry.MCPServerList{
		Servers: []mcpregistry.MCPServer{
			{Name: "io.github.example/weather-server", Status: "active", CreationTimestamp: now, LastUpdatedTimestamp: now},
		},
		NextPageToken: "next",
	}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.SearchServers(ctx, "", "", "", "")

	require.NoError(t, err)
	require.Len(t, result.Servers, 1)
	assert.Equal(t, "io.github.example/weather-server", result.Servers[0].Name)
	assert.Equal(t, "next", result.NextPageToken)
	mockClient.AssertExpectations(t)
}

func TestSearchServersWithTagFilter(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchMCPServers", tmock.Anything, tmock.MatchedBy(func(opts []mcpregistry.SearchMCPServersOption) bool {
		return len(opts) == 1 // filter only
	})).Return(&mcpregistry.MCPServerList{}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	_, err := repo.SearchServers(ctx, "", "category=weather", "", "")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestSearchServersWithRawFilterAndTag(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchMCPServers", tmock.Anything, tmock.MatchedBy(func(opts []mcpregistry.SearchMCPServersOption) bool {
		return len(opts) == 1 // combined filter
	})).Return(&mcpregistry.MCPServerList{}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	_, err := repo.SearchServers(ctx, "name LIKE 'weather%'", "category=weather", "", "")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestSearchServersWithPageTokenAndMaxResults(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchMCPServers", tmock.Anything, tmock.MatchedBy(func(opts []mcpregistry.SearchMCPServersOption) bool {
		return len(opts) == 2 // pageToken + maxResults
	})).Return(&mcpregistry.MCPServerList{}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	_, err := repo.SearchServers(ctx, "", "", "tok", "25")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestSearchServersInvalidMaxResultsIgnored(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchMCPServers", tmock.Anything, tmock.MatchedBy(func(opts []mcpregistry.SearchMCPServersOption) bool {
		return len(opts) == 0
	})).Return(&mcpregistry.MCPServerList{}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	_, err := repo.SearchServers(ctx, "", "", "", "not-a-number")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestSearchServersClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchMCPServers", tmock.Anything, tmock.Anything).
		Return(nil, fmt.Errorf("connection refused"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.SearchServers(ctx, "", "", "", "")

	assert.Nil(t, result)
	assert.EqualError(t, err, "searching MCP servers: connection refused")
	mockClient.AssertExpectations(t)
}

func TestSearchServersMissingClientInContext(t *testing.T) {
	repo := NewMCPRegistryRepository()
	ctx := context.Background()

	result, err := repo.SearchServers(ctx, "", "", "", "")

	assert.Nil(t, result)
	assert.Error(t, err)
}

// --- CreateServer ---

func TestCreateServerSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	now := time.Now()

	mockClient.On("CreateMCPServer", tmock.Anything, "my-server", tmock.MatchedBy(func(opts []mcpregistry.CreateMCPServerOption) bool {
		return len(opts) == 2 // description + icons
	})).Return(&mcpregistry.MCPServer{Name: "my-server", CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.CreateServer(ctx, models.CreateMCPServerRequest{
		Name:        "my-server",
		Description: "desc",
		Icons:       []map[string]any{{"src": "icon.png"}},
	})

	require.NoError(t, err)
	assert.Equal(t, "my-server", result.Name)
	mockClient.AssertExpectations(t)
}

func TestCreateServerClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("CreateMCPServer", tmock.Anything, "my-server", tmock.Anything).
		Return(nil, fmt.Errorf("already exists"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.CreateServer(ctx, models.CreateMCPServerRequest{Name: "my-server"})

	assert.Nil(t, result)
	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

// --- GetServer ---

func TestGetServerSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	now := time.Now()

	mockClient.On("GetMCPServer", tmock.Anything, "my-server").
		Return(&mcpregistry.MCPServer{Name: "my-server", CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.GetServer(ctx, "my-server")

	require.NoError(t, err)
	assert.Equal(t, "my-server", result.Name)
	mockClient.AssertExpectations(t)
}

func TestGetServerNotFound(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("GetMCPServer", tmock.Anything, "missing").
		Return(nil, fmt.Errorf("not found"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.GetServer(ctx, "missing")

	assert.Nil(t, result)
	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

// --- ListServerVersions ---

func TestListServerVersionsSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	now := time.Now()

	mockClient.On("SearchMCPServerVersions", tmock.Anything, "my-server", tmock.MatchedBy(func(opts []mcpregistry.SearchMCPServerVersionsOption) bool {
		return len(opts) == 0
	})).Return(&mcpregistry.MCPServerVersionList{
		Versions: []mcpregistry.MCPServerVersion{
			{Name: "my-server", Version: "1.0.0", CreationTimestamp: now, LastUpdatedTimestamp: now},
		},
	}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.ListServerVersions(ctx, "my-server", "", "")

	require.NoError(t, err)
	require.Len(t, result.Versions, 1)
	assert.Equal(t, "1.0.0", result.Versions[0].Version)
	mockClient.AssertExpectations(t)
}

func TestListServerVersionsWithPagination(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchMCPServerVersions", tmock.Anything, "my-server", tmock.MatchedBy(func(opts []mcpregistry.SearchMCPServerVersionsOption) bool {
		return len(opts) == 2 // pageToken + maxResults
	})).Return(&mcpregistry.MCPServerVersionList{}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	_, err := repo.ListServerVersions(ctx, "my-server", "tok", "10")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestListServerVersionsClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchMCPServerVersions", tmock.Anything, "my-server", tmock.Anything).
		Return(nil, fmt.Errorf("connection refused"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.ListServerVersions(ctx, "my-server", "", "")

	assert.Nil(t, result)
	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

// --- CreateServerVersion ---

func TestCreateServerVersionSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	now := time.Now()
	serverJSON := map[string]any{"name": "my-server"}

	mockClient.On("CreateMCPServerVersion", tmock.Anything, "my-server", serverJSON, tmock.MatchedBy(func(opts []mcpregistry.CreateMCPServerVersionOption) bool {
		return len(opts) == 2 // display_name + status
	})).Return(&mcpregistry.MCPServerVersion{
		Name: "my-server", Version: "1.0.0", ServerJSON: serverJSON,
		CreationTimestamp: now, LastUpdatedTimestamp: now,
	}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.CreateServerVersion(ctx, "my-server", models.CreateMCPServerVersionRequest{
		ServerJSON:  serverJSON,
		DisplayName: "v1",
		Status:      models.MCPServerVersionStatusDraft,
	})

	require.NoError(t, err)
	assert.Equal(t, "1.0.0", result.Version)
	mockClient.AssertExpectations(t)
}

func TestCreateServerVersionClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	serverJSON := map[string]any{"name": "my-server"}

	mockClient.On("CreateMCPServerVersion", tmock.Anything, "my-server", serverJSON, tmock.Anything).
		Return(nil, fmt.Errorf("invalid server.json"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.CreateServerVersion(ctx, "my-server", models.CreateMCPServerVersionRequest{ServerJSON: serverJSON})

	assert.Nil(t, result)
	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

// --- CreateAccessEndpoint ---

func TestCreateAccessEndpointSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	now := time.Now()

	mockClient.On("CreateMCPAccessEndpoint", tmock.Anything, "my-server", "https://mcp.example.com/x", tmock.MatchedBy(func(opts []mcpregistry.CreateMCPAccessEndpointOption) bool {
		return len(opts) == 1 // transport type
	})).Return(&mcpregistry.MCPAccessEndpoint{
		ID: "ep-1", ServerName: "my-server", EndpointURL: "https://mcp.example.com/x",
		CreationTimestamp: now, LastUpdatedTimestamp: now,
	}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.CreateAccessEndpoint(ctx, "my-server", models.CreateMCPAccessEndpointRequest{
		EndpointURL:   "https://mcp.example.com/x",
		TransportType: models.MCPTransportStreamableHTTP,
	})

	require.NoError(t, err)
	assert.Equal(t, "ep-1", result.ID)
	mockClient.AssertExpectations(t)
}

func TestCreateAccessEndpointClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("CreateMCPAccessEndpoint", tmock.Anything, "my-server", "https://mcp.example.com/x", tmock.Anything).
		Return(nil, fmt.Errorf("connection refused"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.CreateAccessEndpoint(ctx, "my-server", models.CreateMCPAccessEndpointRequest{EndpointURL: "https://mcp.example.com/x"})

	assert.Nil(t, result)
	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

// --- SearchAccessEndpoints ---

func TestSearchAccessEndpointsSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	now := time.Now()

	mockClient.On("SearchMCPAccessEndpoints", tmock.Anything, tmock.MatchedBy(func(opts []mcpregistry.SearchMCPAccessEndpointsOption) bool {
		return len(opts) == 1 // server name scoping
	})).Return(&mcpregistry.MCPAccessEndpointList{
		Endpoints: []mcpregistry.MCPAccessEndpoint{
			{ID: "ep-1", ServerName: "my-server", CreationTimestamp: now, LastUpdatedTimestamp: now},
		},
	}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.SearchAccessEndpoints(ctx, "my-server", "", "")

	require.NoError(t, err)
	require.Len(t, result.Endpoints, 1)
	assert.Equal(t, "ep-1", result.Endpoints[0].ID)
	mockClient.AssertExpectations(t)
}

func TestSearchAccessEndpointsWithPagination(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchMCPAccessEndpoints", tmock.Anything, tmock.MatchedBy(func(opts []mcpregistry.SearchMCPAccessEndpointsOption) bool {
		return len(opts) == 3 // server name + pageToken + maxResults
	})).Return(&mcpregistry.MCPAccessEndpointList{}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	_, err := repo.SearchAccessEndpoints(ctx, "my-server", "tok", "10")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestSearchAccessEndpointsClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchMCPAccessEndpoints", tmock.Anything, tmock.Anything).
		Return(nil, fmt.Errorf("connection refused"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.SearchAccessEndpoints(ctx, "my-server", "", "")

	assert.Nil(t, result)
	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

// --- DeleteAccessEndpoint ---

func TestDeleteAccessEndpointSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeleteMCPAccessEndpoint", tmock.Anything, "my-server", "ep-1").Return(nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	err := repo.DeleteAccessEndpoint(ctx, "my-server", "ep-1")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestDeleteAccessEndpointClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeleteMCPAccessEndpoint", tmock.Anything, "my-server", "ep-1").
		Return(fmt.Errorf("not found"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	err := repo.DeleteAccessEndpoint(ctx, "my-server", "ep-1")

	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}
