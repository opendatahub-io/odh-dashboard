package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestStandaloneServiceRequiresTenantIdentity(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/models", nil)
	recorder := httptest.NewRecorder()
	(&app{store: newStore()}).routes().ServeHTTP(recorder, request)
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", recorder.Code)
	}
}

func TestStandaloneServiceConfigDoesNotRequireKubernetes(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/config", nil)
	request.Header.Set("X-User-ID", "user")
	request.Header.Set("X-Tenant-ID", "tenant")
	recorder := httptest.NewRecorder()
	(&app{store: newStore()}).routes().ServeHTTP(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"sandboxesAvailable":false`) {
		t.Fatalf("expected Kubernetes-free config, got %s", recorder.Body.String())
	}
}

func TestStandaloneServiceReturnsEntitledAssetModel(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/aaa/models", nil)
	request.Header.Set("X-User-ID", "user")
	request.Header.Set("X-Tenant-ID", "tenant")
	recorder := httptest.NewRecorder()
	(&app{store: newStore()}).routes().ServeHTTP(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"model_source_type":"maas"`) {
		t.Fatalf("expected MaaS model asset, got %s", recorder.Body.String())
	}
}

func TestStandaloneServiceMockPlayground(t *testing.T) {
	t.Setenv("MOCK_PROVIDER", "true")
	service := &app{store: newStore()}
	request := httptest.NewRequest(http.MethodPost, "/api/v1/lsd/responses", strings.NewReader(`{"model":"demo-model","messages":[{"role":"user","content":"hello"}]}`))
	request.Header.Set("X-User-ID", "user")
	request.Header.Set("X-Tenant-ID", "tenant")
	recorder := httptest.NewRecorder()
	service.routes().ServeHTTP(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "Echo: hello") || !strings.Contains(recorder.Body.String(), `"status":"completed"`) {
		t.Fatalf("expected frontend response contract, got %s", recorder.Body.String())
	}
}

func TestStandaloneServiceAcceptsForwardedBearerIdentity(t *testing.T) {
	service := &app{store: newStore()}
	request := httptest.NewRequest(http.MethodGet, "/api/v1/models", nil)
	request.Header.Set("Authorization", "Bearer keycloak-token")
	recorder := httptest.NewRecorder()
	service.routes().ServeHTTP(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
}

func TestStandaloneServiceProvidesGridIdentityAndNoNamespaces(t *testing.T) {
	service := (&app{store: newStore()}).routes()
	for _, path := range []string{"/api/v1/user", "/api/v1/namespaces"} {
		request := httptest.NewRequest(http.MethodGet, path, nil)
		request.Header.Set("Authorization", "Bearer keycloak-token")
		recorder := httptest.NewRecorder()
		service.ServeHTTP(recorder, request)
		if recorder.Code != http.StatusOK {
			t.Fatalf("%s: expected 200, got %d: %s", path, recorder.Code, recorder.Body.String())
		}
	}
}

func TestStandaloneServiceApiKeySecretIsReturnedOnlyOnCreate(t *testing.T) {
	service := &app{store: newStore()}
	create := httptest.NewRequest(http.MethodPost, "/api/v1/api-keys", strings.NewReader(`{"name":"test","subscription":"default"}`))
	create.Header.Set("X-User-ID", "user")
	create.Header.Set("X-Tenant-ID", "tenant")
	created := httptest.NewRecorder()
	service.routes().ServeHTTP(created, create)
	if created.Code != http.StatusCreated || !strings.Contains(created.Body.String(), `"key":"maas_`) {
		t.Fatalf("expected one-time key response, got %d: %s", created.Code, created.Body.String())
	}

	list := httptest.NewRequest(http.MethodGet, "/api/v1/api-keys", nil)
	list.Header.Set("X-User-ID", "user")
	list.Header.Set("X-Tenant-ID", "tenant")
	listed := httptest.NewRecorder()
	service.routes().ServeHTTP(listed, list)
	if strings.Contains(listed.Body.String(), `"key":"maas_`) {
		t.Fatalf("API key secret was returned from list endpoint: %s", listed.Body.String())
	}
}
