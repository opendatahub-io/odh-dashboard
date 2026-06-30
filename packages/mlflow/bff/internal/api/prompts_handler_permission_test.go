package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mlflow-go/mlflow/promptregistry"
	k8s "github.com/opendatahub-io/mlflow/bff/internal/integrations/kubernetes"
	mlflowpkg "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
	"github.com/opendatahub-io/mlflow/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	tmock "github.com/stretchr/testify/mock"
)

func TestRegisterPromptForbiddenWithoutPermission(t *testing.T) {
	app := &App{
		logger:                  testLogger(),
		repositories:            repositories.NewRepositories(),
		kubernetesClientFactory: newMockK8sClientFactoryWithPermissions(false),
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
		kubernetesClientFactory: newMockK8sClientFactoryWithPermissions(true),
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
		kubernetesClientFactory: newMockK8sClientFactoryWithPermissions(false),
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
		kubernetesClientFactory: newMockK8sClientFactoryWithPermissions(true),
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
		kubernetesClientFactory: newMockK8sClientFactoryWithPermissions(false),
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
		kubernetesClientFactory: newMockK8sClientFactoryWithPermissions(true),
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
