package mocks

import (
	"net/url"
	"testing"

	"github.com/kubeflow/hub/ui/bff/internal/models"
	"github.com/stretchr/testify/require"
)

func TestRuntimeMockSorting(t *testing.T) {
	items := []models.ServingRuntime{
		{ID: stringToPointer("10"), Name: stringToPointer("beta"), CreateTimeSinceEpoch: stringToPointer("10"), LastUpdateTimeSinceEpoch: stringToPointer("2")},
		{ID: stringToPointer("2"), Name: stringToPointer("alpha"), CreateTimeSinceEpoch: stringToPointer("2"), LastUpdateTimeSinceEpoch: stringToPointer("10")},
		{ID: stringToPointer("1")},
	}
	for _, tt := range []struct {
		field    string
		expected []string
	}{
		{"ID", []string{"1", "2", "10"}},
		{"NAME", []string{"1", "2", "10"}},
		{"CREATE_TIME", []string{"1", "2", "10"}},
		{"LAST_UPDATE_TIME", []string{"1", "10", "2"}},
		{"RECOMMENDED", []string{"10", "2", "1"}},
	} {
		for _, direction := range []string{"ASC", "DESC"} {
			t.Run(tt.field+direction, func(t *testing.T) {
				copyItems := append([]models.ServingRuntime(nil), items...)
				result, _, _, err := pageRuntimeMockItems(copyItems, url.Values{"orderBy": {tt.field}, "sortOrder": {direction}}, func(item models.ServingRuntime, field string) string {
					return runtimeMockSortValue(field, item.ID, item.Name, item.CreateTimeSinceEpoch, item.LastUpdateTimeSinceEpoch)
				})
				require.NoError(t, err)
				expected := append([]string(nil), tt.expected...)
				if direction == "DESC" && tt.field != "RECOMMENDED" {
					expected[0], expected[2] = expected[2], expected[0]
				}
				for i, item := range result {
					require.Equal(t, expected[i], *item.ID)
				}
			})
		}
	}
}
