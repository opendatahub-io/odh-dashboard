package api

import (
	"net/http"
	"testing"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEvalHubCRStatusHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	result, response, err := setupApiTest[EvalHubCRStatusEnvelope](
		http.MethodGet,
		EvalHubCRStatusPath+"?namespace=test-ns",
		nil, nil, identity,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Equal(t, "evalhub", result.Data.Name)
	assert.Equal(t, "test-ns", result.Data.Namespace)
	assert.Equal(t, "Ready", result.Data.Phase)
	assert.Equal(t, "True", result.Data.Ready)
	assert.Equal(t, "http://mock-evalhub:8080", result.Data.URL)
	assert.Equal(t, []string{"lm-evaluation-harness", "garak"}, result.Data.ActiveProviders)
	assert.Equal(t, int64(1), result.Data.ReadyReplicas)
	assert.Equal(t, int64(1), result.Data.Replicas)
}

func TestEvalHubCRStatusHandlerMissingNamespace(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	_, response, err := setupApiTest[HTTPError](
		http.MethodGet,
		EvalHubCRStatusPath,
		nil, nil, identity,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
}
