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
	mustBuild := func(tag string) string {
		t.Helper()
		result, err := buildTagFilter(tag)
		assert.NoError(t, err)
		return result
	}

	assert.Equal(t, "", mustBuild(""))
	assert.Equal(t, "tags.`category` = 'weather'", mustBuild("category=weather"))
	assert.Equal(t, "tags.`category` = 'weather=cold'", mustBuild("category=weather=cold"))
	assert.Equal(t, "tags.`category` = 'it\\'s cold'", mustBuild("category=it's cold"))
	// MLflow's own tag-name validation (validate_param_and_metric_name)
	// allows slashes, colons, and spaces, so validTagKey must too, or valid
	// tags silently stop filtering instead of erroring.
	assert.Equal(t, "tags.`team/category` = 'weather'", mustBuild("team/category=weather"))
	assert.Equal(t, "tags.`mlflow:parent` = 'run-1'", mustBuild("mlflow:parent=run-1"))
	assert.Equal(t, "tags.`my key` = 'v'", mustBuild("my key=v"))
	// A value ending in a lone backslash must not turn the closing quote
	// into an escaped (and thus non-terminating) literal quote: the
	// backslash itself must be escaped first, so the output ends in an
	// escaped backslash followed by a real closing quote.
	assert.Equal(t, "tags.`k` = 'x\\\\'", mustBuild(`k=x\`))

	// Malformed or disallowed tags return ErrInvalidFilter instead of
	// silently dropping the filter (fail-closed).
	_, err := buildTagFilter("nokey")
	assert.ErrorIs(t, err, ErrInvalidFilter)

	_, err = buildTagFilter("a`b=weather")
	assert.ErrorIs(t, err, ErrInvalidFilter)
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
	// An unmatched paren inside a quoted string literal is part of the
	// value, not filter syntax, so it must not count toward the balance
	// check (e.g. buildTagFilter("note=see(details") produces this).
	assert.True(t, hasBalancedParens("tags.`note` = 'see(details'"))
	assert.True(t, hasBalancedParens(`tags."note" = "see)details"`))
	// A backslash-escaped quote inside a quoted string literal (as
	// buildTagFilter produces for a value containing an apostrophe, e.g.
	// "it's") must not be mistaken for the closing quote: doing so would
	// treat a real "(" later in the value as outside the string and
	// falsely flag it as unbalanced. Matches how MLflow's own filter
	// parser (sqlparse) tokenizes backslash-escaped quotes in string
	// literals.
	assert.True(t, hasBalancedParens(`tags.`+"`"+`note`+"`"+` = 'it\'s(here'`))
	assert.True(t, hasBalancedParens(`tags.`+"`"+`note`+"`"+` = "it\"s(here"`))
	// A trailing backslash right before the closing quote must not cause
	// an out-of-bounds skip past the end of the string.
	assert.True(t, hasBalancedParens(`'x\\'`))
}

func TestSearchServersWithTagContainingUnbalancedParenIsNotRejected(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchMCPServers", tmock.Anything, tmock.MatchedBy(func(opts []mcpregistry.SearchMCPServersOption) bool {
		return len(opts) == 1
	})).Return(&mcpregistry.MCPServerList{}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	// The tag value contains a lone "(" that, unescaped, would look like
	// an unbalanced paren to combineFilters -- but it's safely inside the
	// quoted string literal buildTagFilter produces, so it must not be
	// rejected as ErrInvalidFilter.
	_, err := repo.SearchServers(ctx, "", "note=see(details", "", "")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestSearchServersWithTagContainingApostropheAndParenIsNotRejected(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchMCPServers", tmock.Anything, tmock.MatchedBy(func(opts []mcpregistry.SearchMCPServersOption) bool {
		return len(opts) == 1
	})).Return(&mcpregistry.MCPServerList{}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	// The tag value contains both an apostrophe (which buildTagFilter
	// backslash-escapes) and a "(" after it. The escaped quote must not
	// be mistaken for the closing quote by the paren-balance check, or
	// the trailing "(" would look unbalanced and this would be wrongly
	// rejected as ErrInvalidFilter.
	_, err := repo.SearchServers(ctx, "", "note=it's(here", "", "")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
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

func TestGetServerEmbeddedAccessEndpointResolvedVersion(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	now := time.Now()

	mockClient.On("GetMCPServer", tmock.Anything, "my-server").
		Return(&mcpregistry.MCPServer{
			Name: "my-server", CreationTimestamp: now, LastUpdatedTimestamp: now,
			AccessEndpoints: []mcpregistry.MCPAccessEndpointSummary{
				{
					ID: "ep-1", ServerName: "my-server", ServerAlias: "production",
					ResolvedVersion: &mcpregistry.MCPServerVersion{Name: "my-server", Version: "2.0.0"},
				},
			},
		}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.GetServer(ctx, "my-server")

	require.NoError(t, err)
	require.Len(t, result.AccessEndpoints, 1)
	require.NotNil(t, result.AccessEndpoints[0].ResolvedVersion)
	assert.Equal(t, "2.0.0", result.AccessEndpoints[0].ResolvedVersion.Version)
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

// --- UpdateServer ---

func TestUpdateServerSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	now := time.Now()
	displayName := "New Name"

	mockClient.On("UpdateMCPServer", tmock.Anything, "my-server", tmock.MatchedBy(func(opts []mcpregistry.UpdateMCPServerOption) bool {
		return len(opts) == 1 // display name only
	})).Return(&mcpregistry.MCPServer{Name: "my-server", DisplayName: displayName, CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.UpdateServer(ctx, "my-server", models.UpdateMCPServerRequest{DisplayName: &displayName})

	require.NoError(t, err)
	assert.Equal(t, displayName, result.DisplayName)
	mockClient.AssertExpectations(t)
}

func TestUpdateServerAllFields(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	displayName := "New Name"
	description := "New description"
	icons := []map[string]any{{"src": "icon.png"}}

	mockClient.On("UpdateMCPServer", tmock.Anything, "my-server", tmock.MatchedBy(func(opts []mcpregistry.UpdateMCPServerOption) bool {
		return len(opts) == 3
	})).Return(&mcpregistry.MCPServer{Name: "my-server"}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	_, err := repo.UpdateServer(ctx, "my-server", models.UpdateMCPServerRequest{
		DisplayName: &displayName,
		Description: &description,
		Icons:       &icons,
	})

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestUpdateServerNoFieldsSet(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("UpdateMCPServer", tmock.Anything, "my-server", tmock.MatchedBy(func(opts []mcpregistry.UpdateMCPServerOption) bool {
		return len(opts) == 0
	})).Return(&mcpregistry.MCPServer{Name: "my-server"}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	_, err := repo.UpdateServer(ctx, "my-server", models.UpdateMCPServerRequest{})

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestUpdateServerClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("UpdateMCPServer", tmock.Anything, "my-server", tmock.Anything).
		Return(nil, fmt.Errorf("not found"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.UpdateServer(ctx, "my-server", models.UpdateMCPServerRequest{})

	assert.Nil(t, result)
	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

// --- DeleteServer ---

func TestDeleteServerSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeleteMCPServer", tmock.Anything, "my-server").Return(nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	err := repo.DeleteServer(ctx, "my-server")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestDeleteServerClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeleteMCPServer", tmock.Anything, "my-server").
		Return(fmt.Errorf("not found"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	err := repo.DeleteServer(ctx, "my-server")

	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

// --- SetServerTag / DeleteServerTag ---

func TestSetServerTagSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SetMCPServerTag", tmock.Anything, "my-server", "category", "weather").Return(nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	err := repo.SetServerTag(ctx, "my-server", models.SetMCPTagRequest{Key: "category", Value: "weather"})

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestSetServerTagClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SetMCPServerTag", tmock.Anything, "my-server", "category", "weather").
		Return(fmt.Errorf("invalid key"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	err := repo.SetServerTag(ctx, "my-server", models.SetMCPTagRequest{Key: "category", Value: "weather"})

	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

func TestDeleteServerTagSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeleteMCPServerTag", tmock.Anything, "my-server", "category").Return(nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	err := repo.DeleteServerTag(ctx, "my-server", "category")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestDeleteServerTagClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeleteMCPServerTag", tmock.Anything, "my-server", "category").
		Return(fmt.Errorf("not found"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	err := repo.DeleteServerTag(ctx, "my-server", "category")

	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

// --- SetServerAlias / GetServerVersionByAlias / DeleteServerAlias ---

func TestSetServerAliasSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SetMCPServerAlias", tmock.Anything, "my-server", "production", "1.0.0").Return(nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	err := repo.SetServerAlias(ctx, "my-server", models.SetMCPAliasRequest{Alias: "production", Version: "1.0.0"})

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestSetServerAliasClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SetMCPServerAlias", tmock.Anything, "my-server", "production", "1.0.0").
		Return(fmt.Errorf("version not found"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	err := repo.SetServerAlias(ctx, "my-server", models.SetMCPAliasRequest{Alias: "production", Version: "1.0.0"})

	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

func TestGetServerVersionByAliasSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	now := time.Now()

	mockClient.On("GetMCPServerVersionByAlias", tmock.Anything, "my-server", "production").
		Return(&mcpregistry.MCPServerVersion{Name: "my-server", Version: "1.0.0", CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.GetServerVersionByAlias(ctx, "my-server", "production")

	require.NoError(t, err)
	assert.Equal(t, "1.0.0", result.Version)
	mockClient.AssertExpectations(t)
}

func TestGetServerVersionByAliasNotFound(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("GetMCPServerVersionByAlias", tmock.Anything, "my-server", "missing").
		Return(nil, fmt.Errorf("not found"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.GetServerVersionByAlias(ctx, "my-server", "missing")

	assert.Nil(t, result)
	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

func TestDeleteServerAliasSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeleteMCPServerAlias", tmock.Anything, "my-server", "production").Return(nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	err := repo.DeleteServerAlias(ctx, "my-server", "production")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestDeleteServerAliasClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeleteMCPServerAlias", tmock.Anything, "my-server", "production").
		Return(fmt.Errorf("not found"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	err := repo.DeleteServerAlias(ctx, "my-server", "production")

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
	serverJSON := models.MCPServerJSON{Name: "my-server"}
	serverJSONMap := serverJSON.AsMap()

	mockClient.On("CreateMCPServerVersion", tmock.Anything, "my-server", serverJSONMap, tmock.MatchedBy(func(opts []mcpregistry.CreateMCPServerVersionOption) bool {
		return len(opts) == 1 // status only; there is no version-level display_name
	})).Return(&mcpregistry.MCPServerVersion{
		Name: "my-server", Version: "1.0.0", ServerJSON: serverJSONMap,
		CreationTimestamp: now, LastUpdatedTimestamp: now,
	}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.CreateServerVersion(ctx, "my-server", models.CreateMCPServerVersionRequest{
		ServerJSON: serverJSON,
		Status:     models.MCPServerVersionStatusDraft,
	})

	require.NoError(t, err)
	assert.Equal(t, "1.0.0", result.Version)
	mockClient.AssertExpectations(t)
}

func TestCreateServerVersionClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	serverJSON := models.MCPServerJSON{Name: "my-server"}

	mockClient.On("CreateMCPServerVersion", tmock.Anything, "my-server", serverJSON.AsMap(), tmock.Anything).
		Return(nil, fmt.Errorf("invalid server.json"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.CreateServerVersion(ctx, "my-server", models.CreateMCPServerVersionRequest{ServerJSON: serverJSON})

	assert.Nil(t, result)
	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

// --- GetServerVersion ---

func TestGetServerVersionSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	now := time.Now()

	mockClient.On("GetMCPServerVersion", tmock.Anything, "my-server", "1.0.0").
		Return(&mcpregistry.MCPServerVersion{Name: "my-server", Version: "1.0.0", CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.GetServerVersion(ctx, "my-server", "1.0.0")

	require.NoError(t, err)
	assert.Equal(t, "1.0.0", result.Version)
	mockClient.AssertExpectations(t)
}

func TestGetServerVersionNotFound(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("GetMCPServerVersion", tmock.Anything, "my-server", "9.9.9").
		Return(nil, fmt.Errorf("not found"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.GetServerVersion(ctx, "my-server", "9.9.9")

	assert.Nil(t, result)
	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

// --- UpdateServerVersion ---

func TestUpdateServerVersionSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	now := time.Now()
	status := models.MCPServerVersionStatusActive

	mockClient.On("UpdateMCPServerVersion", tmock.Anything, "my-server", "1.0.0", tmock.MatchedBy(func(opts []mcpregistry.UpdateMCPServerVersionOption) bool {
		return len(opts) == 1 // status only
	})).Return(&mcpregistry.MCPServerVersion{
		Name: "my-server", Version: "1.0.0", Status: mcpregistry.MCPServerVersionStatusActive,
		CreationTimestamp: now, LastUpdatedTimestamp: now,
	}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.UpdateServerVersion(ctx, "my-server", "1.0.0", models.UpdateMCPServerVersionRequest{Status: &status})

	require.NoError(t, err)
	assert.Equal(t, models.MCPServerVersionStatusActive, result.Status)
	mockClient.AssertExpectations(t)
}

func TestUpdateServerVersionAllFields(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	status := models.MCPServerVersionStatusDeprecated
	tools := []models.MCPTool{{Name: "tool1"}}
	connectOptions := map[string]models.MCPConnectOptionSettings{"npm": {Hidden: true}}

	mockClient.On("UpdateMCPServerVersion", tmock.Anything, "my-server", "1.0.0", tmock.MatchedBy(func(opts []mcpregistry.UpdateMCPServerVersionOption) bool {
		return len(opts) == 3
	})).Return(&mcpregistry.MCPServerVersion{Name: "my-server", Version: "1.0.0"}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	_, err := repo.UpdateServerVersion(ctx, "my-server", "1.0.0", models.UpdateMCPServerVersionRequest{
		Status:         &status,
		Tools:          &tools,
		ConnectOptions: &connectOptions,
	})

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestUpdateServerVersionClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("UpdateMCPServerVersion", tmock.Anything, "my-server", "1.0.0", tmock.Anything).
		Return(nil, fmt.Errorf("not found"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.UpdateServerVersion(ctx, "my-server", "1.0.0", models.UpdateMCPServerVersionRequest{})

	assert.Nil(t, result)
	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

// --- DeleteServerVersion ---

func TestDeleteServerVersionSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeleteMCPServerVersion", tmock.Anything, "my-server", "1.0.0").Return(nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	err := repo.DeleteServerVersion(ctx, "my-server", "1.0.0")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestDeleteServerVersionClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeleteMCPServerVersion", tmock.Anything, "my-server", "1.0.0").
		Return(fmt.Errorf("not found"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	err := repo.DeleteServerVersion(ctx, "my-server", "1.0.0")

	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

// --- SetServerVersionTag / DeleteServerVersionTag ---

func TestSetServerVersionTagSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SetMCPServerVersionTag", tmock.Anything, "my-server", "1.0.0", "stability", "beta").Return(nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	err := repo.SetServerVersionTag(ctx, "my-server", "1.0.0", models.SetMCPTagRequest{Key: "stability", Value: "beta"})

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestSetServerVersionTagClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SetMCPServerVersionTag", tmock.Anything, "my-server", "1.0.0", "stability", "beta").
		Return(fmt.Errorf("invalid key"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	err := repo.SetServerVersionTag(ctx, "my-server", "1.0.0", models.SetMCPTagRequest{Key: "stability", Value: "beta"})

	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

func TestDeleteServerVersionTagSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeleteMCPServerVersionTag", tmock.Anything, "my-server", "1.0.0", "stability").Return(nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	err := repo.DeleteServerVersionTag(ctx, "my-server", "1.0.0", "stability")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestDeleteServerVersionTagClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeleteMCPServerVersionTag", tmock.Anything, "my-server", "1.0.0", "stability").
		Return(fmt.Errorf("not found"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	err := repo.DeleteServerVersionTag(ctx, "my-server", "1.0.0", "stability")

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

// --- GetAccessEndpoint ---

func TestGetAccessEndpointSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	now := time.Now()

	mockClient.On("GetMCPAccessEndpoint", tmock.Anything, "my-server", "ep-1").
		Return(&mcpregistry.MCPAccessEndpoint{ID: "ep-1", ServerName: "my-server", CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.GetAccessEndpoint(ctx, "my-server", "ep-1")

	require.NoError(t, err)
	assert.Equal(t, "ep-1", result.ID)
	mockClient.AssertExpectations(t)
}

func TestGetAccessEndpointResolvedVersion(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	now := time.Now()

	mockClient.On("GetMCPAccessEndpoint", tmock.Anything, "my-server", "ep-1").
		Return(&mcpregistry.MCPAccessEndpoint{
			ID: "ep-1", ServerName: "my-server", ServerAlias: "production",
			CreationTimestamp: now, LastUpdatedTimestamp: now,
			ResolvedVersion: &mcpregistry.MCPServerVersion{
				Name: "my-server", Version: "2.0.0",
				Status: mcpregistry.MCPServerVersionStatusActive,
			},
		}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.GetAccessEndpoint(ctx, "my-server", "ep-1")

	require.NoError(t, err)
	require.NotNil(t, result.ResolvedVersion)
	assert.Equal(t, "2.0.0", result.ResolvedVersion.Version)
	assert.Equal(t, models.MCPServerVersionStatusActive, result.ResolvedVersion.Status)
	mockClient.AssertExpectations(t)
}

func TestGetAccessEndpointNoResolvedVersion(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	now := time.Now()

	mockClient.On("GetMCPAccessEndpoint", tmock.Anything, "my-server", "ep-1").
		Return(&mcpregistry.MCPAccessEndpoint{ID: "ep-1", ServerName: "my-server", CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.GetAccessEndpoint(ctx, "my-server", "ep-1")

	require.NoError(t, err)
	assert.Nil(t, result.ResolvedVersion)
	mockClient.AssertExpectations(t)
}

func TestGetAccessEndpointNotFound(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("GetMCPAccessEndpoint", tmock.Anything, "my-server", "missing").
		Return(nil, fmt.Errorf("not found"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.GetAccessEndpoint(ctx, "my-server", "missing")

	assert.Nil(t, result)
	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

// --- UpdateAccessEndpoint ---

func TestUpdateAccessEndpointSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	now := time.Now()
	url := "https://mcp.example.com/new"

	mockClient.On("UpdateMCPAccessEndpoint", tmock.Anything, "my-server", "ep-1", tmock.MatchedBy(func(opts []mcpregistry.UpdateMCPAccessEndpointOption) bool {
		return len(opts) == 1 // URL only
	})).Return(&mcpregistry.MCPAccessEndpoint{
		ID: "ep-1", ServerName: "my-server", EndpointURL: url,
		CreationTimestamp: now, LastUpdatedTimestamp: now,
	}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.UpdateAccessEndpoint(ctx, "my-server", "ep-1", models.UpdateMCPAccessEndpointRequest{EndpointURL: &url})

	require.NoError(t, err)
	assert.Equal(t, url, result.EndpointURL)
	mockClient.AssertExpectations(t)
}

func TestUpdateAccessEndpointAllFields(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	url := "https://mcp.example.com/new"
	transportType := models.MCPTransportSSE
	version := "2.0.0"
	alias := ""

	mockClient.On("UpdateMCPAccessEndpoint", tmock.Anything, "my-server", "ep-1", tmock.MatchedBy(func(opts []mcpregistry.UpdateMCPAccessEndpointOption) bool {
		return len(opts) == 4
	})).Return(&mcpregistry.MCPAccessEndpoint{ID: "ep-1", ServerName: "my-server"}, nil)

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	_, err := repo.UpdateAccessEndpoint(ctx, "my-server", "ep-1", models.UpdateMCPAccessEndpointRequest{
		EndpointURL:   &url,
		TransportType: &transportType,
		ServerVersion: &version,
		ServerAlias:   &alias,
	})

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestUpdateAccessEndpointClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("UpdateMCPAccessEndpoint", tmock.Anything, "my-server", "ep-1", tmock.Anything).
		Return(nil, fmt.Errorf("not found"))

	repo := NewMCPRegistryRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.UpdateAccessEndpoint(ctx, "my-server", "ep-1", models.UpdateMCPAccessEndpointRequest{})

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
