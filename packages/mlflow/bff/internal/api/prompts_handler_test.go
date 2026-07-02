package api

import (
	"context"
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
	"github.com/opendatahub-io/mlflow/bff/internal/config"
	"github.com/opendatahub-io/mlflow/bff/internal/constants"
	k8s "github.com/opendatahub-io/mlflow/bff/internal/integrations/kubernetes"
	mlflowpkg "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
	"github.com/opendatahub-io/mlflow/bff/internal/models"
	"github.com/opendatahub-io/mlflow/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	tmock "github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
)

func newTestAppWithPromptsRepos() *App {
	return &App{
		logger:                  testLogger(),
		repositories:            repositories.NewRepositories(),
		kubernetesClientFactory: newMockK8sClientFactoryWithVerb(true, ""),
	}
}

func newMockK8sClientFactoryWithVerb(canWrite bool, expectedVerb string) k8s.KubernetesClientFactory {
	return &mockK8sClientFactory{canWrite: canWrite, expectedVerb: expectedVerb}
}

type mockK8sClientFactory struct {
	canWrite     bool
	expectedVerb string
}

func (f *mockK8sClientFactory) ExtractRequestIdentity(httpHeader http.Header) (*k8s.RequestIdentity, error) {
	return &k8s.RequestIdentity{UserID: "test-user"}, nil
}

func (f *mockK8sClientFactory) ValidateRequestIdentity(identity *k8s.RequestIdentity) error {
	return nil
}

func (f *mockK8sClientFactory) GetClient(ctx context.Context) (k8s.KubernetesClientInterface, error) {
	return &mockK8sClient{canWrite: f.canWrite, expectedVerb: f.expectedVerb}, nil
}

type mockK8sClient struct {
	canWrite     bool
	expectedVerb string
}

func (c *mockK8sClient) GetNamespaces(ctx context.Context, identity *k8s.RequestIdentity) ([]corev1.Namespace, error) {
	return nil, nil
}

func (c *mockK8sClient) IsClusterAdmin(identity *k8s.RequestIdentity) (bool, error) {
	return false, nil
}

func (c *mockK8sClient) GetUser(identity *k8s.RequestIdentity) (string, error) {
	return "test-user", nil
}

func (c *mockK8sClient) CanWritePromptsInNamespace(ctx context.Context, namespace string, verb string) (bool, error) {
	if c.expectedVerb != "" && verb != c.expectedVerb {
		return false, fmt.Errorf("unexpected verb: got %q, expected %q", verb, c.expectedVerb)
	}
	return c.canWrite, nil
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
	req := httptest.NewRequest(http.MethodPost, "/api/v1/prompts?workspace=my-ns", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowRegisterPromptHandler(rr, req, nil)

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Contains(t, rr.Header().Get("Location"), "test-prompt")
	assert.Contains(t, rr.Header().Get("Location"), "workspace=my-ns")

	var envelope PromptVersionEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Equal(t, "test-prompt", envelope.Data.Name)
	assert.Equal(t, 1, envelope.Data.Version)
}

func TestRegisterTextPromptSuccess(t *testing.T) {
	app := newTestAppWithPromptsRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("RegisterPrompt", tmock.Anything, "text-prompt", "Hello {{name}}", tmock.Anything).
		Return(&promptregistry.PromptVersion{
			Name: "text-prompt", Version: 1, Template: "Hello {{name}}",
			CreatedAt: now, UpdatedAt: now,
		}, nil)

	body := `{"name":"text-prompt","template":"Hello {{name}}"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/prompts?workspace=my-ns", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
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
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("LoadPrompt", tmock.Anything, "existing", tmock.Anything).
		Return(&promptregistry.PromptVersion{
			Name: "existing", Version: 1, Template: "exists",
			CreatedAt: now, UpdatedAt: now,
		}, nil)

	body := `{"name":"existing","template":"Hello","create_only":true}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/prompts?workspace=my-ns", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowRegisterPromptHandler(rr, req, nil)

	assert.Equal(t, http.StatusConflict, rr.Code)
}

func TestRegisterPromptCreateOnlyNotFound(t *testing.T) {
	app := newTestAppWithPromptsRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
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
	req := httptest.NewRequest(http.MethodPost, "/api/v1/prompts?workspace=my-ns", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
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
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeletePrompt", tmock.Anything, "to-delete").Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/prompts/to-delete?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	ps := httprouter.Params{{Key: "name", Value: "to-delete"}}
	app.MLflowDeletePromptHandler(rr, req, ps)

	assert.Equal(t, http.StatusNoContent, rr.Code)
	mockClient.AssertExpectations(t)
}

// --- DeletePromptVersion ---

func TestDeletePromptVersionSuccess(t *testing.T) {
	app := newTestAppWithPromptsRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeletePromptVersion", tmock.Anything, "my-prompt", 1).Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/prompts/my-prompt/versions/1?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
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

// --- Global Namespace Awareness ---

func newTestAppWithGlobalNamespaces(globalNs []string, factory mlflowpkg.MLflowClientFactory) *App {
	return &App{
		config:              config.EnvConfig{AuthMethod: config.AuthMethodUser},
		logger:              testLogger(),
		repositories:        repositories.NewRepositories(),
		mlflowClientFactory: factory,
		globalNamespaces:    globalNs,
	}
}

func withIdentityToken(req *http.Request, token string) *http.Request {
	identity := &k8s.RequestIdentity{Token: k8s.NewBearerToken(token)}
	ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
	return req.WithContext(ctx)
}

func TestListPromptsWithScopeAnnotation(t *testing.T) {
	app := newTestAppWithPromptsRepos()
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("ListPrompts", tmock.Anything, tmock.Anything).
		Return(&promptregistry.PromptList{
			Prompts: []promptregistry.Prompt{
				{Name: "my-prompt", LatestVersion: 1, CreationTimestamp: now},
			},
		}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/prompts?workspace=my-project", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-project")
	rr := httptest.NewRecorder()

	app.MLflowListPromptsHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var envelope PromptsEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	require.Len(t, envelope.Data.Prompts, 1)
	assert.Equal(t, "project", string(envelope.Data.Prompts[0].Scope.Type))
	assert.Equal(t, "my-project", envelope.Data.Prompts[0].Scope.Namespace)
}

func TestListPromptsWithGlobalNamespace(t *testing.T) {
	userClient := &mlflowpkg.MockClient{}
	globalClient := &mlflowpkg.MockClient{}
	mockFactory := &mlflowpkg.MockFactory{}

	now := time.Now()
	userClient.On("ListPrompts", tmock.Anything, tmock.Anything).
		Return(&promptregistry.PromptList{
			Prompts: []promptregistry.Prompt{
				{Name: "user-prompt", LatestVersion: 1, CreationTimestamp: now},
			},
		}, nil)

	globalClient.On("ListPrompts", tmock.Anything, tmock.Anything).
		Return(&promptregistry.PromptList{
			Prompts: []promptregistry.Prompt{
				{Name: "global-prompt", LatestVersion: 2, CreationTimestamp: now},
			},
		}, nil)

	mockFactory.On("GetClient", tmock.Anything, "test-token", "global-ns").
		Return(globalClient, nil)

	app := newTestAppWithGlobalNamespaces([]string{"global-ns"}, mockFactory)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/prompts?workspace=my-project", nil)
	req = requestWithMLflowClient(req, userClient)
	req = withIdentityToken(req, "test-token")
	req = withWorkspace(req, "my-project")
	rr := httptest.NewRecorder()

	app.MLflowListPromptsHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var envelope PromptsEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	require.Len(t, envelope.Data.Prompts, 2)

	scopeMap := make(map[string]models.PromptScope)
	for _, p := range envelope.Data.Prompts {
		scopeMap[p.Name] = p.Scope
	}

	assert.Equal(t, models.PromptScopeProject, scopeMap["user-prompt"].Type)
	assert.Equal(t, "my-project", scopeMap["user-prompt"].Namespace)
	assert.Equal(t, models.PromptScopeGlobal, scopeMap["global-prompt"].Type)
	assert.Equal(t, "global-ns", scopeMap["global-prompt"].Namespace)

	userClient.AssertExpectations(t)
	globalClient.AssertExpectations(t)
	mockFactory.AssertExpectations(t)
}

func TestListPromptsGlobalNamespaceFailsGracefully(t *testing.T) {
	userClient := &mlflowpkg.MockClient{}
	mockFactory := &mlflowpkg.MockFactory{}

	now := time.Now()
	userClient.On("ListPrompts", tmock.Anything, tmock.Anything).
		Return(&promptregistry.PromptList{
			Prompts: []promptregistry.Prompt{
				{Name: "user-prompt", LatestVersion: 1, CreationTimestamp: now},
			},
		}, nil)

	mockFactory.On("GetClient", tmock.Anything, "test-token", "bad-ns").
		Return(nil, fmt.Errorf("connection refused"))

	app := newTestAppWithGlobalNamespaces([]string{"bad-ns"}, mockFactory)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/prompts?workspace=my-project", nil)
	req = requestWithMLflowClient(req, userClient)
	req = withIdentityToken(req, "test-token")
	req = withWorkspace(req, "my-project")
	rr := httptest.NewRecorder()

	app.MLflowListPromptsHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var envelope PromptsEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	require.Len(t, envelope.Data.Prompts, 1)
	assert.Equal(t, "user-prompt", envelope.Data.Prompts[0].Name)
	assert.Equal(t, models.PromptScopeProject, envelope.Data.Prompts[0].Scope.Type)
	require.Len(t, envelope.Data.FailedNamespaces, 1)
	assert.Equal(t, "bad-ns", envelope.Data.FailedNamespaces[0])

	userClient.AssertExpectations(t)
	mockFactory.AssertExpectations(t)
}

func TestListPromptsNoGlobalNamespacesConfigured(t *testing.T) {
	app := newTestAppWithPromptsRepos()
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("ListPrompts", tmock.Anything, tmock.Anything).
		Return(&promptregistry.PromptList{
			Prompts: []promptregistry.Prompt{
				{Name: "only-user", LatestVersion: 1, CreationTimestamp: now},
			},
		}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/prompts?workspace=my-project", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-project")
	rr := httptest.NewRecorder()

	app.MLflowListPromptsHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var envelope PromptsEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	require.Len(t, envelope.Data.Prompts, 1)
	assert.Equal(t, models.PromptScopeProject, envelope.Data.Prompts[0].Scope.Type)
	assert.Equal(t, "my-project", envelope.Data.Prompts[0].Scope.Namespace)
}

// --- Permission Tests ---

func TestRegisterPromptForbiddenWithoutPermission(t *testing.T) {
	app := &App{
		logger:                  testLogger(),
		repositories:            repositories.NewRepositories(),
		kubernetesClientFactory: newMockK8sClientFactoryWithVerb(false, "create"),
	}

	mockClient := &mlflowpkg.MockClient{}

	body := `{"name":"test-prompt","messages":[{"role":"user","content":"Hello"}]}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/prompts?workspace=my-ns", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	req = withIdentity(req, &k8s.RequestIdentity{UserID: "test-user"})
	rr := httptest.NewRecorder()

	app.MLflowRegisterPromptHandler(rr, req, nil)

	assert.Equal(t, http.StatusForbidden, rr.Code)
	mockClient.AssertNotCalled(t, "RegisterChatPrompt")
}

func TestRegisterPromptSuccessWithPermission(t *testing.T) {
	app := &App{
		logger:                  testLogger(),
		repositories:            repositories.NewRepositories(),
		kubernetesClientFactory: newMockK8sClientFactoryWithVerb(true, "create"),
	}

	mockClient := &mlflowpkg.MockClient{}
	now := time.Now()
	mockClient.On("RegisterChatPrompt", tmock.Anything, "test-prompt", tmock.Anything, tmock.Anything).
		Return(&promptregistry.PromptVersion{
			Name: "test-prompt", Version: 1,
			Messages:  []promptregistry.ChatMessage{{Role: "user", Content: "Hello"}},
			CreatedAt: now, UpdatedAt: now,
		}, nil)

	body := `{"name":"test-prompt","messages":[{"role":"user","content":"Hello"}]}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/prompts?workspace=my-ns", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	req = withIdentity(req, &k8s.RequestIdentity{UserID: "test-user"})
	rr := httptest.NewRecorder()

	app.MLflowRegisterPromptHandler(rr, req, nil)

	assert.Equal(t, http.StatusCreated, rr.Code)
	mockClient.AssertExpectations(t)
}

func TestDeletePromptForbiddenWithoutPermission(t *testing.T) {
	app := &App{
		logger:                  testLogger(),
		repositories:            repositories.NewRepositories(),
		kubernetesClientFactory: newMockK8sClientFactoryWithVerb(false, "delete"),
	}

	mockClient := &mlflowpkg.MockClient{}

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/prompts/test-prompt?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	req = withIdentity(req, &k8s.RequestIdentity{UserID: "test-user"})
	rr := httptest.NewRecorder()

	ps := httprouter.Params{{Key: "name", Value: "test-prompt"}}
	app.MLflowDeletePromptHandler(rr, req, ps)

	assert.Equal(t, http.StatusForbidden, rr.Code)
	mockClient.AssertNotCalled(t, "DeletePrompt")
}

func TestDeletePromptSuccessWithPermission(t *testing.T) {
	app := &App{
		logger:                  testLogger(),
		repositories:            repositories.NewRepositories(),
		kubernetesClientFactory: newMockK8sClientFactoryWithVerb(true, "delete"),
	}

	mockClient := &mlflowpkg.MockClient{}
	mockClient.On("DeletePrompt", tmock.Anything, "test-prompt").
		Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/prompts/test-prompt?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	req = withIdentity(req, &k8s.RequestIdentity{UserID: "test-user"})
	rr := httptest.NewRecorder()

	ps := httprouter.Params{{Key: "name", Value: "test-prompt"}}
	app.MLflowDeletePromptHandler(rr, req, ps)

	assert.Equal(t, http.StatusNoContent, rr.Code)
	mockClient.AssertExpectations(t)
}

func TestDeletePromptVersionForbiddenWithoutPermission(t *testing.T) {
	app := &App{
		logger:                  testLogger(),
		repositories:            repositories.NewRepositories(),
		kubernetesClientFactory: newMockK8sClientFactoryWithVerb(false, "delete"),
	}

	mockClient := &mlflowpkg.MockClient{}

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/prompts/test-prompt/versions/1?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	req = withIdentity(req, &k8s.RequestIdentity{UserID: "test-user"})
	rr := httptest.NewRecorder()

	ps := httprouter.Params{
		{Key: "name", Value: "test-prompt"},
		{Key: "version", Value: "1"},
	}
	app.MLflowDeletePromptVersionHandler(rr, req, ps)

	assert.Equal(t, http.StatusForbidden, rr.Code)
	mockClient.AssertNotCalled(t, "DeletePromptVersion")
}

func TestDeletePromptVersionSuccessWithPermission(t *testing.T) {
	app := &App{
		logger:                  testLogger(),
		repositories:            repositories.NewRepositories(),
		kubernetesClientFactory: newMockK8sClientFactoryWithVerb(true, "delete"),
	}

	mockClient := &mlflowpkg.MockClient{}
	mockClient.On("DeletePromptVersion", tmock.Anything, "test-prompt", 1).
		Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/prompts/test-prompt/versions/1?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	req = withIdentity(req, &k8s.RequestIdentity{UserID: "test-user"})
	rr := httptest.NewRecorder()

	ps := httprouter.Params{
		{Key: "name", Value: "test-prompt"},
		{Key: "version", Value: "1"},
	}
	app.MLflowDeletePromptVersionHandler(rr, req, ps)

	assert.Equal(t, http.StatusNoContent, rr.Code)
	mockClient.AssertExpectations(t)
}

func TestRegisterPromptPermissionCheckError(t *testing.T) {
	mockFactory := &mockK8sClientFactoryWithError{}

	app := &App{
		logger:                  testLogger(),
		repositories:            repositories.NewRepositories(),
		kubernetesClientFactory: mockFactory,
	}

	mockClient := &mlflowpkg.MockClient{}

	body := `{"name":"test-prompt","messages":[{"role":"user","content":"Hello"}]}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/prompts?workspace=my-ns", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	req = withIdentity(req, &k8s.RequestIdentity{UserID: "test-user"})
	rr := httptest.NewRecorder()

	app.MLflowRegisterPromptHandler(rr, req, nil)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	mockClient.AssertNotCalled(t, "RegisterChatPrompt")
}

func TestDeletePromptPermissionCheckError(t *testing.T) {
	mockFactory := &mockK8sClientFactoryWithError{}

	app := &App{
		logger:                  testLogger(),
		repositories:            repositories.NewRepositories(),
		kubernetesClientFactory: mockFactory,
	}

	mockClient := &mlflowpkg.MockClient{}

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/prompts/test-prompt?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	req = withIdentity(req, &k8s.RequestIdentity{UserID: "test-user"})
	rr := httptest.NewRecorder()

	ps := httprouter.Params{{Key: "name", Value: "test-prompt"}}
	app.MLflowDeletePromptHandler(rr, req, ps)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	mockClient.AssertNotCalled(t, "DeletePrompt")
}

func TestDeletePromptVersionPermissionCheckError(t *testing.T) {
	mockFactory := &mockK8sClientFactoryWithError{}

	app := &App{
		logger:                  testLogger(),
		repositories:            repositories.NewRepositories(),
		kubernetesClientFactory: mockFactory,
	}

	mockClient := &mlflowpkg.MockClient{}

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/prompts/test-prompt/versions/1?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	req = withIdentity(req, &k8s.RequestIdentity{UserID: "test-user"})
	rr := httptest.NewRecorder()

	ps := httprouter.Params{
		{Key: "name", Value: "test-prompt"},
		{Key: "version", Value: "1"},
	}
	app.MLflowDeletePromptVersionHandler(rr, req, ps)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	mockClient.AssertNotCalled(t, "DeletePromptVersion")
}

func TestEnforceWritePermissionBypassedWhenAuthDisabled(t *testing.T) {
	app := &App{
		config: config.EnvConfig{AuthMethod: config.AuthMethodDisabled},
		logger: testLogger(),
		// kubernetesClientFactory intentionally nil — bypass must not call it
	}
	req := httptest.NewRequest(http.MethodPost, "/", nil)
	rr := httptest.NewRecorder()
	result := app.enforceWritePermission(context.Background(), rr, req, "my-ns", "create")
	assert.True(t, result)
	// ResponseRecorder initializes with implicit 200, but no error response was written
	// Verify the body is empty to confirm no error handler was called
	assert.Empty(t, rr.Body.String())
}

type mockK8sClientFactoryWithError struct{}

func (f *mockK8sClientFactoryWithError) ExtractRequestIdentity(httpHeader http.Header) (*k8s.RequestIdentity, error) {
	return &k8s.RequestIdentity{UserID: "test-user"}, nil
}

func (f *mockK8sClientFactoryWithError) ValidateRequestIdentity(identity *k8s.RequestIdentity) error {
	return nil
}

func (f *mockK8sClientFactoryWithError) GetClient(ctx context.Context) (k8s.KubernetesClientInterface, error) {
	return &mockK8sClientWithPermissionError{}, nil
}

type mockK8sClientWithPermissionError struct{}

func (c *mockK8sClientWithPermissionError) GetNamespaces(ctx context.Context, identity *k8s.RequestIdentity) ([]corev1.Namespace, error) {
	return nil, nil
}

func (c *mockK8sClientWithPermissionError) IsClusterAdmin(identity *k8s.RequestIdentity) (bool, error) {
	return false, nil
}

func (c *mockK8sClientWithPermissionError) GetUser(identity *k8s.RequestIdentity) (string, error) {
	return "test-user", nil
}

func (c *mockK8sClientWithPermissionError) CanWritePromptsInNamespace(ctx context.Context, namespace string, verb string) (bool, error) {
	return false, fmt.Errorf("k8s api error")
}
