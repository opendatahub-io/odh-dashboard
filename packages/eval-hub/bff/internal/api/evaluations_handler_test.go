package api

import (
	"net/http"
	"testing"

	ehmocks "github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub/ehmocks"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEvaluationJobsHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	result, response, err := setupApiTestWithEvalHub[EvaluationJobsEnvelope](
		http.MethodGet,
		EvaluationJobsPath+"?namespace=test-ns",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Len(t, result.Data, 6)
	assert.Equal(t, "eval-job-001", result.Data[0].Resource.ID)
	assert.Equal(t, "running", result.Data[0].Status.State)
	assert.Equal(t, "gpt-4-turbo", result.Data[0].Model.Name)
}

func TestEvaluationJobsHandlerWithQueryParams(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	result, response, err := setupApiTestWithEvalHub[EvaluationJobsEnvelope](
		http.MethodGet,
		EvaluationJobsPath+"?namespace=test-ns&limit=10&offset=0&status=running&name=test&tags=safety",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Len(t, result.Data, 6)
}

func TestGetEvaluationJobHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	result, response, err := setupApiTestWithEvalHub[EvaluationJobEnvelope](
		http.MethodGet,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001?namespace=test-ns",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Equal(t, "eval-job-001", result.Data.Resource.ID)
	assert.Equal(t, "running", result.Data.Status.State)
}

func TestGetEvaluationJobHandlerNotInList(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodGet,
		ApiPathPrefix+"/evaluations/jobs/nonexistent-job?namespace=test-ns",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, response.StatusCode)
}

func TestCancelEvaluationJobHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	result, response, err := setupApiTestWithEvalHub[CancelEvaluationJobEnvelope](
		http.MethodDelete,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001?namespace=test-ns",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Equal(t, "ok", result.Data)
}

func TestCancelEvaluationJobHandlerHardDelete(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	result, response, err := setupApiTestWithEvalHub[CancelEvaluationJobEnvelope](
		http.MethodDelete,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001?namespace=test-ns&hard_delete=true",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Equal(t, "ok", result.Data)
}

func TestCancelEvaluationJobHandlerInvalidHardDelete(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodDelete,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001?namespace=test-ns&hard_delete=tru",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
}
