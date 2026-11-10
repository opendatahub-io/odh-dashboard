package lsmocks

import (
	"context"
	"strings"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMockUploadFileReturnsValidID(t *testing.T) {
	client := NewMockLlamaStackClient()
	result, err := client.UploadFile(context.Background(), llamastack.UploadFileParams{})
	require.NoError(t, err)
	require.NoError(t, llamastack.ValidateFileID(result.FileID))

	file, err := client.GetFile(context.Background(), result.FileID)
	require.NoError(t, err)
	assert.Equal(t, result.FileID, file.ID)
}

func TestMockListModels_IncludesMaaSPrefixedModels(t *testing.T) {
	client := NewMockLlamaStackClient()

	models, err := client.ListModels(context.Background())
	require.NoError(t, err)

	var maasModels []string
	for _, m := range models {
		if strings.HasPrefix(m.ID, "maas-") {
			maasModels = append(maasModels, m.ID)
		}
	}

	assert.Len(t, maasModels, 2)
	assert.Contains(t, maasModels, "maas-mock-provider-1/llama-2-7b-chat")
	assert.Contains(t, maasModels, "maas-mock-provider-1/llama-2-13b-chat")
}
