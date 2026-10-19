package mocks

import (
	"net/url"
	"testing"

	"github.com/kubeflow/hub/ui/bff/internal/models"
	"github.com/stretchr/testify/require"
)

func TestCatalogMockFilterModes(t *testing.T) {
	agents := []models.Agent{{Framework: stringToPointer("LangGraph")}, {Framework: stringToPointer("CrewAI")}}
	for _, tt := range []struct {
		query       string
		count       int
		strictError bool
	}{
		{"", 2, false},
		{"framework='langgraph'", 1, false},
		{"framework IN ('LangGraph', 'CrewAI')", 2, false},
		{"framework IN ('LangGraph', 'CrewAI') AND framework='CrewAI'", 1, false},
		{"framework=LangGraph", 1, true},
		{"unsupported expression", 2, true},
		{"framework='LangGraph' AND ", 1, true},
		{"unknown='value'", 0, true},
		{"framework='missing'", 0, false},
	} {
		t.Run(tt.query, func(t *testing.T) {
			require.Len(t, filterAgentsByQuery(agents, tt.query), tt.count)
			filtered, err := filterCatalogMockItems(agents, tt.query, strictCatalogMockQuery, []string{"framework"}, agentMatchesFilter)
			if tt.strictError {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				require.Len(t, filtered, tt.count)
			}
		})
	}
}

func TestCatalogMockPaginationModes(t *testing.T) {
	items := []int{1, 2, 3}
	for _, tt := range []struct {
		name        string
		query       url.Values
		expected    []int
		token       string
		size        int32
		strictError bool
	}{
		{"defaults", nil, []int{1, 2, 3}, "", 10, false},
		{"first page", url.Values{"pageSize": {"2"}}, []int{1, 2}, "2", 2, false},
		{"next page", url.Values{"pageSize": {"2"}, "nextPageToken": {"2"}}, []int{3}, "", 2, false},
		{"past end", url.Values{"nextPageToken": {"9223372036854775807"}}, []int{}, "", 10, false},
		{"invalid size", url.Values{"pageSize": {"invalid"}}, []int{1, 2, 3}, "", 10, true},
		{"zero size", url.Values{"pageSize": {"0"}}, []int{1, 2, 3}, "", 10, true},
		{"large size", url.Values{"pageSize": {"2147483648"}}, []int{1, 2, 3}, "", 2147483647, true},
		{"negative token", url.Values{"nextPageToken": {"-1"}}, []int{1, 2, 3}, "", 10, true},
		{"invalid token", url.Values{"nextPageToken": {"invalid"}}, []int{1, 2, 3}, "", 10, true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			for _, mode := range []catalogMockQueryMode{permissiveCatalogMockQuery, strictCatalogMockQuery} {
				page, token, size, err := pageCatalogMockItems(items, tt.query, mode)
				if mode == strictCatalogMockQuery && tt.strictError {
					require.Error(t, err)
					continue
				}
				require.NoError(t, err)
				require.Equal(t, tt.expected, page)
				require.Equal(t, tt.token, token)
				require.Equal(t, tt.size, size)
			}
		})
	}
	page, _, _, err := pageCatalogMockItems[int](nil, nil, permissiveCatalogMockQuery)
	require.NoError(t, err)
	require.NotNil(t, page)
	require.Empty(t, page)
}
