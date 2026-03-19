package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/opendatahub-io/mlflow-go/mlflow/tracking"
	"github.com/opendatahub-io/mlflow/bff/internal/constants"
	mlflowpkg "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
	"github.com/opendatahub-io/mlflow/bff/internal/models"
	"github.com/opendatahub-io/mlflow/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	tmock "github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func newTestAppWithRepos() *App {
	return &App{
		logger:       testLogger(),
		repositories: repositories.NewRepositories(),
	}
}

func requestWithMLflowClient(req *http.Request, client mlflowpkg.ClientInterface) *http.Request {
	ctx := context.WithValue(req.Context(), constants.MLflowClientKey, client)
	return req.WithContext(ctx)
}

func TestListExperimentsHandlerSuccess(t *testing.T) {
	app := newTestAppWithRepos()
	mockClient := &mlflowpkg.MockClient{}

	now := time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC)
	mockClient.On("SearchExperiments", tmock.Anything, tmock.Anything).
		Return(&tracking.ExperimentList{
			Experiments: []tracking.Experiment{
				{
					ID:               "0",
					Name:             "Default",
					ArtifactLocation: "s3://mlflow/0",
					LifecycleStage:   "active",
					Tags:             map[string]string{},
					CreationTime:     now,
					LastUpdateTime:   now,
				},
				{
					ID:               "1",
					Name:             "my-experiment",
					ArtifactLocation: "s3://mlflow/1",
					LifecycleStage:   "active",
					Tags:             map[string]string{"owner": "user1"},
					CreationTime:     now,
					LastUpdateTime:   now,
				},
			},
			NextPageToken: "",
		}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	req = requestWithMLflowClient(req, mockClient)
	rr := httptest.NewRecorder()

	app.MLflowListExperimentsHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var envelope ExperimentsEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Len(t, envelope.Data.Experiments, 2)
	assert.Equal(t, "Default", envelope.Data.Experiments[0].Name)
	assert.Equal(t, "my-experiment", envelope.Data.Experiments[1].Name)
	assert.Equal(t, map[string]string{"owner": "user1"}, envelope.Data.Experiments[1].Tags)
	mockClient.AssertExpectations(t)
}

func TestListExperimentsHandlerEmptyList(t *testing.T) {
	app := newTestAppWithRepos()
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchExperiments", tmock.Anything, tmock.Anything).
		Return(&tracking.ExperimentList{
			Experiments: []tracking.Experiment{},
		}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	req = requestWithMLflowClient(req, mockClient)
	rr := httptest.NewRecorder()

	app.MLflowListExperimentsHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var envelope ExperimentsEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Empty(t, envelope.Data.Experiments)
	mockClient.AssertExpectations(t)
}

func TestListExperimentsHandlerWithPagination(t *testing.T) {
	app := newTestAppWithRepos()
	mockClient := &mlflowpkg.MockClient{}

	now := time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC)
	mockClient.On("SearchExperiments", tmock.Anything, tmock.Anything).
		Return(&tracking.ExperimentList{
			Experiments: []tracking.Experiment{
				{ID: "2", Name: "page-2-exp", CreationTime: now, LastUpdateTime: now, Tags: map[string]string{}},
			},
			NextPageToken: "next-page",
		}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments?pageToken=abc&maxResults=10", nil)
	req = requestWithMLflowClient(req, mockClient)
	rr := httptest.NewRecorder()

	app.MLflowListExperimentsHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var envelope ExperimentsEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Len(t, envelope.Data.Experiments, 1)
	assert.Equal(t, "next-page", envelope.Data.NextPageToken)
	mockClient.AssertExpectations(t)
}

func TestListExperimentsHandlerInvalidMaxResults(t *testing.T) {
	app := newTestAppWithRepos()
	mockClient := &mlflowpkg.MockClient{}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments?maxResults=not-a-number", nil)
	req = requestWithMLflowClient(req, mockClient)
	rr := httptest.NewRecorder()

	app.MLflowListExperimentsHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)

	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Contains(t, errResp.Error.Message, "invalid syntax")
}

func TestListExperimentsHandlerNegativeMaxResults(t *testing.T) {
	app := newTestAppWithRepos()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments?maxResults=-5", nil)
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowListExperimentsHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)

	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Contains(t, errResp.Error.Message, "maxResults must be a positive integer")
}

func TestListExperimentsHandlerZeroMaxResults(t *testing.T) {
	app := newTestAppWithRepos()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments?maxResults=0", nil)
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowListExperimentsHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)

	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Contains(t, errResp.Error.Message, "maxResults must be a positive integer")
}

func TestListExperimentsHandlerClientError(t *testing.T) {
	app := newTestAppWithRepos()
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchExperiments", tmock.Anything, tmock.Anything).
		Return(nil, fmt.Errorf("connection refused"))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	req = requestWithMLflowClient(req, mockClient)
	rr := httptest.NewRecorder()

	app.MLflowListExperimentsHandler(rr, req, nil)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	mockClient.AssertExpectations(t)
}

func TestListExperimentsHandlerNoClientInContext(t *testing.T) {
	app := newTestAppWithRepos()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	rr := httptest.NewRecorder()

	app.MLflowListExperimentsHandler(rr, req, nil)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestListExperimentsHandlerWithFilter(t *testing.T) {
	app := newTestAppWithRepos()
	mockClient := &mlflowpkg.MockClient{}

	now := time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC)
	mockClient.On("SearchExperiments", tmock.Anything, tmock.Anything).
		Return(&tracking.ExperimentList{
			Experiments: []tracking.Experiment{
				{ID: "1", Name: "filtered-exp", CreationTime: now, LastUpdateTime: now, Tags: map[string]string{}},
			},
		}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments?filter=name+LIKE+%27filtered%25%27", nil)
	req = requestWithMLflowClient(req, mockClient)
	rr := httptest.NewRecorder()

	app.MLflowListExperimentsHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var envelope ExperimentsEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Len(t, envelope.Data.Experiments, 1)
	assert.Equal(t, "filtered-exp", envelope.Data.Experiments[0].Name)
	mockClient.AssertExpectations(t)
}

func TestExperimentsEnvelopeJSONFormat(t *testing.T) {
	now := time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC)
	envelope := ExperimentsEnvelope{
		Data: models.ExperimentsResponse{
			Experiments: []models.Experiment{
				{
					ID:             "0",
					Name:           "Default",
					LifecycleStage: "active",
					CreationTime:   now,
					LastUpdateTime: now,
				},
			},
			NextPageToken: "token123",
		},
	}

	data, err := json.Marshal(envelope)
	require.NoError(t, err)

	var parsed map[string]interface{}
	require.NoError(t, json.Unmarshal(data, &parsed))
	dataField, ok := parsed["data"].(map[string]interface{})
	require.True(t, ok)
	experiments, ok := dataField["experiments"].([]interface{})
	require.True(t, ok)
	assert.Len(t, experiments, 1)
	assert.Equal(t, "token123", dataField["nextPageToken"])
}
