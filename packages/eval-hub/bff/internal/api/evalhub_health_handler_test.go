package api

import (
	"errors"
	"net/http"
	"testing"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEvalHubServiceHealthHandler_CRNotFound(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	result, response, err := setupApiTestForHealth[EvalHubServiceHealthEnvelope](
		http.MethodGet,
		EvalHubServiceHealthPath,
		identity,
		nil, // no CR found
		nil, // no error
		nil, // default mock EH client (not reached)
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.False(t, result.Data.Available)
	assert.Equal(t, EvalHubHealthStatusCRNotFound, result.Data.Status)
}

func TestEvalHubServiceHealthHandler_CRFoundButServiceUnreachable(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	crStatus := &models.EvalHubCRStatus{
		Name:      "evalhub",
		Namespace: "test-dashboard-ns",
		Phase:     "Ready",
		URL:       "http://evalhub.test.svc.cluster.local",
	}

	result, response, err := setupApiTestForHealth[EvalHubServiceHealthEnvelope](
		http.MethodGet,
		EvalHubServiceHealthPath,
		identity,
		crStatus,
		nil,
		&erroringEHClient{}, // service ping fails
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.False(t, result.Data.Available)
	assert.Equal(t, EvalHubHealthStatusServiceUnreachable, result.Data.Status)
}

func TestEvalHubServiceHealthHandler_Healthy(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	crStatus := &models.EvalHubCRStatus{
		Name:      "evalhub",
		Namespace: "test-dashboard-ns",
		Phase:     "Ready",
		URL:       "http://evalhub.test.svc.cluster.local",
	}

	result, response, err := setupApiTestForHealth[EvalHubServiceHealthEnvelope](
		http.MethodGet,
		EvalHubServiceHealthPath,
		identity,
		crStatus,
		nil,
		nil, // default mock returns healthy
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.True(t, result.Data.Available)
	assert.Equal(t, EvalHubHealthStatusHealthy, result.Data.Status)
}

func TestEvalHubServiceHealthHandler_CRDiscoveryError(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	discoveryErr := errors.New("kubernetes API unreachable")

	_, response, err := setupApiTestForHealth[EvalHubServiceHealthEnvelope](
		http.MethodGet,
		EvalHubServiceHealthPath,
		identity,
		nil,
		discoveryErr, // CR discovery itself fails
		nil,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, response.StatusCode)
}

func TestEvalHubServiceHealthHandler_MockMode(t *testing.T) {
	// When MockEvalHubClient is true the handler returns healthy immediately,
	// bypassing CR discovery and the service ping entirely.
	// setupApiTestWithEvalHub sets MockEvalHubClient: true.
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	result, response, err := setupApiTestWithEvalHub[EvalHubServiceHealthEnvelope](
		http.MethodGet,
		EvalHubServiceHealthPath,
		nil, nil, identity, nil,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.True(t, result.Data.Available)
	assert.Equal(t, EvalHubHealthStatusHealthy, result.Data.Status)
}
