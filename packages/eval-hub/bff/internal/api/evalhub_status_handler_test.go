package api

import (
	"context"
	"net/http"
	"testing"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
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

func TestEvalHubCRStatusHandler_FallbackToClusterWideDiscovery(t *testing.T) {
	// When the CR is not in the user's namespace, the handler should fall back
	// to SA-based cluster-wide discovery.
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	// K8s client returns nil for the user's namespace (CR not there).
	k8sClient := &crStatusOverrideK8sClient{
		fn: func(_ context.Context, _ *kubernetes.RequestIdentity, _ string) (*models.EvalHubCRStatus, error) {
			return nil, nil
		},
	}

	crFromCluster := &models.EvalHubCRStatus{
		Name: "evalhub", Namespace: "custom-ns", Phase: "Ready",
		Ready: "True", URL: "http://evalhub.custom-ns.svc:8080",
		ReadyReplicas: 1, Replicas: 1,
	}

	result, response, err := setupApiTestForCRStatus[EvalHubCRStatusEnvelope](
		http.MethodGet,
		EvalHubCRStatusPath+"?namespace=tenant-b",
		identity,
		&crStatusK8sFactory{client: k8sClient},
		&mockCRDiscoverer{crStatus: crFromCluster},
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Equal(t, "evalhub", result.Data.Name)
	assert.Equal(t, "custom-ns", result.Data.Namespace)
	assert.Equal(t, "http://evalhub.custom-ns.svc:8080", result.Data.URL)
}
