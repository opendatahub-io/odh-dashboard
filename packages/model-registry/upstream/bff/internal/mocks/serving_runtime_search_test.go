package mocks

import (
	"testing"

	"github.com/kubeflow/hub/ui/bff/internal/models"
	"github.com/stretchr/testify/require"
)

func TestRuntimeMockMatchesSearchOptionalFields(t *testing.T) {
	for _, tt := range []struct {
		name    string
		runtime models.ServingRuntime
		query   string
		matches bool
	}{
		{"no search and no fields", models.ServingRuntime{}, "", true},
		{"search with no fields", models.ServingRuntime{}, "vllm", false},
		{"name only", models.ServingRuntime{Name: stringToPointer("vLLM")}, "vllm", true},
		{"display name only", models.ServingRuntime{DisplayName: stringToPointer("Model Server")}, "server", true},
		{"description only", models.ServingRuntime{Description: stringToPointer("GPU inference")}, "gpu", true},
		{"missing description does not match", models.ServingRuntime{Name: stringToPointer("vllm")}, "gpu", false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.matches, runtimeMockMatchesSearch(tt.runtime, tt.query))
		})
	}
}
