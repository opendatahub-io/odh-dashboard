package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/julienschmidt/httprouter"
	sdkmlflow "github.com/opendatahub-io/mlflow-go/mlflow"
	"github.com/opendatahub-io/mlflow-go/mlflow/promptregistry"
	mlflowpkg "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
	"github.com/opendatahub-io/mlflow/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	tmock "github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func newTestAppWithPromptsRepos() *App {
	return &App{
		logger:       testLogger(),
		repositories: repositories.NewRepositories(),
	}
}

// --- ListPrompts ---

func TestListPromptsSuccess(t *testing.T) {
	app := newTestAppWithPromptsRepos()
	mockClient := &mlflowpkg.MockClient{}

	now := time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC)
	mockClient.On("ListPrompts", tmock.Anything, tmock.Anything).
		Return(&promptregistry.PromptList{
			Prompts: []promptregistry.Prompt{
				{Name: "prompt-a", Description: "desc a", LatestVersion: 1, CreationTimestamp: now},
				{Name: "prompt-b", Description: "desc b", LatestVersion: 2, Tags: map[string]string{"env": "prod"}, CreationTimestamp: now},
			},
		}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/prompts", nil)
	req = requestWithMLflowClient(req, mockClient)
	rr := httptest.NewRecorder()

	app.MLflowListPromptsHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var envelope PromptsEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Len(t, envelope.Data.Prompts, 2)
	assert.Equal(t, "prompt-a", envelope.Data.Prompts[0].Name)
	assert.Equal(t, "prompt-b", envelope.Data.Prompts[1].Name)
	mockClient.AssertExpectations(t)
}

func TestListPromptsEmpty(t *testing.T) {
	app := newTestAppWithPromptsRepos()
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("ListPrompts", tmock.Anything, tmock.Anything).
		Return(&promptregistry.PromptList{Prompts: []promptregistry.Prompt{}}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/prompts", nil)
	req = requestWithMLflowClient(req, mockClient)
	rr := httptest.NewRecorder()

	app.MLflowListPromptsHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)
	var envelope PromptsEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Empty(t, envelope.Data.Prompts)
}

func TestListPromptsClientError(t *testing.T) {
	app := newTestAppWithPromptsRepos()
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("ListPrompts", tmock.Anything, tmock.Anything).
		Return(nil, fmt.Errorf("connection refused"))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/prompts", nil)
	req = requestWithMLflowClient(req, mockClient)
	rr := httptest.NewRecorder()

	app.MLflowListPromptsHandler(rr, req, nil)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestListPromptsNoClientInContext(t *testing.T) {
	app := newTestAppWithPromptsRepos()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/prompts", nil)
	rr := httptest.NewRecorder()

	app.MLflowListPromptsHandler(rr, req, nil)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// --- RegisterPrompt ---

func TestRegisterChatPromptSuccess(t *testing.T) {
	app := newTestAppWithPromptsRepos()
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("RegisterChatPrompt", tmock.Anything, "test-prompt", tmock.Anything, tmock.Anything).
		Return(&promptregistry.PromptVersion{
			Name: "test-prompt", Version: 1,
			Messages:  []promptregistry.ChatMessage{{Role: "user", Content: "Hello"}},
			CreatedAt: now, UpdatedAt: now,
		}, nil)

	body := `{"name":"test-prompt","messages":[{"role":"user","content":"Hello"}]}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/prompts", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	rr := httptest.NewRecorder()

	app.MLflowRegisterPromptHandler(rr, req, nil)

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Contains(t, rr.Header().Get("Location"), "test-prompt")

	var envelope PromptVersionEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Equal(t, "test-prompt", envelope.Data.Name)
	assert.Equal(t, 1, envelope.Data.Version)
}

func TestRegisterTextPromptSuccess(t *testing.T) {
	app := newTestAppWithPromptsRepos()
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("RegisterPrompt", tmock.Anything, "text-prompt", "Hello {{name}}", tmock.Anything).
		Return(&promptregistry.PromptVersion{
			Name: "text-prompt", Version: 1, Template: "Hello {{name}}",
			CreatedAt: now, UpdatedAt: now,
		}, nil)

	body := `{"name":"text-prompt","template":"Hello {{name}}"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/prompts", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	rr := httptest.NewRecorder()

	app.MLflowRegisterPromptHandler(rr, req, nil)

	assert.Equal(t, http.StatusCreated, rr.Code)
}

func TestRegisterPromptMissingName(t *testing.T) {
	app := newTestAppWithPromptsRepos()

	body := `{"template":"Hello"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/prompts", strings.NewReader(body))
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowRegisterPromptHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestRegisterPromptInvalidName(t *testing.T) {
	app := newTestAppWithPromptsRepos()

	body := `{"name":"foo/bar","template":"Hello"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/prompts", strings.NewReader(body))
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowRegisterPromptHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestRegisterPromptNoContent(t *testing.T) {
	app := newTestAppWithPromptsRepos()

	body := `{"name":"empty-prompt"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/prompts", strings.NewReader(body))
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowRegisterPromptHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestRegisterPromptBothMessagesAndTemplate(t *testing.T) {
	app := newTestAppWithPromptsRepos()

	body := `{"name":"both","template":"Hello","messages":[{"role":"user","content":"Hi"}]}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/prompts", strings.NewReader(body))
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowRegisterPromptHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestRegisterPromptCreateOnlyConflict(t *testing.T) {
	app := newTestAppWithPromptsRepos()
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("LoadPrompt", tmock.Anything, "existing", tmock.Anything).
		Return(&promptregistry.PromptVersion{
			Name: "existing", Version: 1, Template: "exists",
			CreatedAt: now, UpdatedAt: now,
		}, nil)

	body := `{"name":"existing","template":"Hello","create_only":true}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/prompts", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	rr := httptest.NewRecorder()

	app.MLflowRegisterPromptHandler(rr, req, nil)

	assert.Equal(t, http.StatusConflict, rr.Code)
}

func TestRegisterPromptCreateOnlyNotFound(t *testing.T) {
	app := newTestAppWithPromptsRepos()
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("LoadPrompt", tmock.Anything, "new-prompt", tmock.Anything).
		Return(nil, &sdkmlflow.APIError{StatusCode: http.StatusNotFound, Message: "not found"})

	now := time.Now()
	mockClient.On("RegisterPrompt", tmock.Anything, "new-prompt", "Hello", tmock.Anything).
		Return(&promptregistry.PromptVersion{
			Name: "new-prompt", Version: 1, Template: "Hello",
			CreatedAt: now, UpdatedAt: now,
		}, nil)

	body := `{"name":"new-prompt","template":"Hello","create_only":true}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/prompts", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	rr := httptest.NewRecorder()

	app.MLflowRegisterPromptHandler(rr, req, nil)

	assert.Equal(t, http.StatusCreated, rr.Code)
}

// --- LoadPrompt ---

func TestLoadPromptSuccess(t *testing.T) {
	app := newTestAppWithPromptsRepos()
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("LoadPrompt", tmock.Anything, "my-prompt", tmock.Anything).
		Return(&promptregistry.PromptVersion{
			Name: "my-prompt", Version: 1, Template: "Hello {{name}}",
			CreatedAt: now, UpdatedAt: now,
		}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/prompts/my-prompt", nil)
	req = requestWithMLflowClient(req, mockClient)
	rr := httptest.NewRecorder()

	ps := httprouter.Params{{Key: "name", Value: "my-prompt"}}
	app.MLflowLoadPromptHandler(rr, req, ps)

	assert.Equal(t, http.StatusOK, rr.Code)

	var envelope PromptVersionEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Equal(t, "my-prompt", envelope.Data.Name)
	assert.Equal(t, 1, envelope.Data.Version)
}

func TestLoadPromptNotFound(t *testing.T) {
	app := newTestAppWithPromptsRepos()
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("LoadPrompt", tmock.Anything, "nonexistent", tmock.Anything).
		Return(nil, &sdkmlflow.APIError{StatusCode: http.StatusNotFound, Message: "not found"})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/prompts/nonexistent", nil)
	req = requestWithMLflowClient(req, mockClient)
	rr := httptest.NewRecorder()

	ps := httprouter.Params{{Key: "name", Value: "nonexistent"}}
	app.MLflowLoadPromptHandler(rr, req, ps)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestLoadPromptInvalidVersion(t *testing.T) {
	app := newTestAppWithPromptsRepos()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/prompts/my-prompt?version=abc", nil)
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	ps := httprouter.Params{{Key: "name", Value: "my-prompt"}}
	app.MLflowLoadPromptHandler(rr, req, ps)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

// --- ListPromptVersions ---

func TestListPromptVersionsSuccess(t *testing.T) {
	app := newTestAppWithPromptsRepos()
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("ListPromptVersions", tmock.Anything, "my-prompt", tmock.Anything).
		Return(&promptregistry.PromptVersionList{
			Versions: []promptregistry.PromptVersion{
				{Version: 1, CommitMessage: "v1", CreatedAt: now, UpdatedAt: now},
				{Version: 2, CommitMessage: "v2", CreatedAt: now, UpdatedAt: now},
			},
		}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/prompts/my-prompt/versions", nil)
	req = requestWithMLflowClient(req, mockClient)
	rr := httptest.NewRecorder()

	ps := httprouter.Params{{Key: "name", Value: "my-prompt"}}
	app.MLflowListPromptVersionsHandler(rr, req, ps)

	assert.Equal(t, http.StatusOK, rr.Code)

	var envelope PromptVersionsEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Len(t, envelope.Data.Versions, 2)
}

// --- DeletePrompt ---

func TestDeletePromptSuccess(t *testing.T) {
	app := newTestAppWithPromptsRepos()
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeletePrompt", tmock.Anything, "to-delete").Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/prompts/to-delete", nil)
	req = requestWithMLflowClient(req, mockClient)
	rr := httptest.NewRecorder()

	ps := httprouter.Params{{Key: "name", Value: "to-delete"}}
	app.MLflowDeletePromptHandler(rr, req, ps)

	assert.Equal(t, http.StatusNoContent, rr.Code)
	mockClient.AssertExpectations(t)
}

// --- DeletePromptVersion ---

func TestDeletePromptVersionSuccess(t *testing.T) {
	app := newTestAppWithPromptsRepos()
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeletePromptVersion", tmock.Anything, "my-prompt", 1).Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/prompts/my-prompt/versions/1", nil)
	req = requestWithMLflowClient(req, mockClient)
	rr := httptest.NewRecorder()

	ps := httprouter.Params{{Key: "name", Value: "my-prompt"}, {Key: "version", Value: "1"}}
	app.MLflowDeletePromptVersionHandler(rr, req, ps)

	assert.Equal(t, http.StatusNoContent, rr.Code)
	mockClient.AssertExpectations(t)
}

func TestDeletePromptVersionInvalidVersion(t *testing.T) {
	app := newTestAppWithPromptsRepos()

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/prompts/my-prompt/versions/abc", nil)
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	ps := httprouter.Params{{Key: "name", Value: "my-prompt"}, {Key: "version", Value: "abc"}}
	app.MLflowDeletePromptVersionHandler(rr, req, ps)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}
