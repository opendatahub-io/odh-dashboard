package modelregistry

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/kubeflow/model-registry/pkg/openapi"
)

// validBaseURL returns a base URL that passes validateModelRegistryURL.
// The httptest server URL is embedded in a path that contains /api/model_registry/.
func validBaseURL(serverURL string) string {
	return serverURL + "/api/model_registry/v1alpha3"
}

// === validateModelRegistryURL ===

func TestValidateModelRegistryURL(t *testing.T) {
	tests := []struct {
		name    string
		url     string
		wantErr bool
		errMsg  string
	}{
		{
			name:    "valid HTTPS URL with required path",
			url:     "https://registry.example.com/api/model_registry/v1alpha3",
			wantErr: false,
		},
		{
			name:    "HTTP scheme rejected",
			url:     "http://registry.example.com/api/model_registry/v1alpha3",
			wantErr: true,
			errMsg:  "HTTPS",
		},
		{
			name:    "missing path segment",
			url:     "https://registry.example.com/api/v1/models",
			wantErr: true,
			errMsg:  "/api/model_registry/",
		},
		{
			name:    "empty URL",
			url:     "",
			wantErr: true,
			errMsg:  "invalid",
		},
		{
			name:    "malformed URL",
			url:     "://bad",
			wantErr: true,
			errMsg:  "invalid",
		},
		{
			name:    "missing scheme",
			url:     "registry.example.com/api/model_registry/v1",
			wantErr: true,
			errMsg:  "invalid",
		},
		{
			name:    "missing host",
			url:     "https:///api/model_registry/v1",
			wantErr: true,
			errMsg:  "invalid",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateModelRegistryURL(tt.url)
			if tt.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				} else if tt.errMsg != "" && !strings.Contains(err.Error(), tt.errMsg) {
					t.Errorf("expected error containing %q, got: %v", tt.errMsg, err)
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
			}
		})
	}
}

// === HTTPError ===

func TestHTTPError_Error(t *testing.T) {
	e := &HTTPError{
		StatusCode: 404,
		ErrorResponse: ErrorResponse{
			Code:    "404",
			Message: "model not found",
		},
	}
	got := e.Error()
	if !strings.Contains(got, "404") {
		t.Errorf("expected status code in error string, got: %q", got)
	}
	if !strings.Contains(got, "model not found") {
		t.Errorf("expected message in error string, got: %q", got)
	}
}

// === parseErrorResponse ===

func TestParseErrorResponse(t *testing.T) {
	t.Run("valid JSON error body", func(t *testing.T) {
		body := `{"code": "CONFLICT", "message": "model already exists"}`
		err := parseErrorResponse(409, []byte(body))
		if err.StatusCode != 409 {
			t.Errorf("expected status 409, got %d", err.StatusCode)
		}
		if err.Code != "CONFLICT" {
			t.Errorf("expected code 'CONFLICT', got %q", err.Code)
		}
		if err.Message != "model already exists" {
			t.Errorf("expected message 'model already exists', got %q", err.Message)
		}
	})

	t.Run("non-JSON error body", func(t *testing.T) {
		body := "Internal Server Error"
		err := parseErrorResponse(500, []byte(body))
		if err.StatusCode != 500 {
			t.Errorf("expected status 500, got %d", err.StatusCode)
		}
		if err.Code != "500" {
			t.Errorf("expected code '500', got %q", err.Code)
		}
		if err.Message != "Internal Server Error" {
			t.Errorf("expected raw body as message, got %q", err.Message)
		}
	})

	t.Run("JSON without code field", func(t *testing.T) {
		body := `{"message": "something went wrong"}`
		err := parseErrorResponse(400, []byte(body))
		if err.Code != "400" {
			t.Errorf("expected code '400' (from status), got %q", err.Code)
		}
		if err.Message != "something went wrong" {
			t.Errorf("expected message from JSON, got %q", err.Message)
		}
	})

	t.Run("empty body", func(t *testing.T) {
		err := parseErrorResponse(503, []byte(""))
		if err.StatusCode != 503 {
			t.Errorf("expected status 503, got %d", err.StatusCode)
		}
		// Empty body is invalid JSON, so code falls back to status code string.
		if err.Code != "503" {
			t.Errorf("expected code '503', got %q", err.Code)
		}
	})
}

// === CreateRegisteredModel ===

func TestCreateRegisteredModel(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		modelID := "rm-123"
		server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost {
				t.Errorf("expected POST, got %s", r.Method)
			}
			if !strings.HasSuffix(r.URL.Path, registeredModelsPath) {
				t.Errorf("unexpected path: %s", r.URL.Path)
			}
			if r.Header.Get("Content-Type") != "application/json" {
				t.Errorf("expected application/json content type, got %q", r.Header.Get("Content-Type"))
			}

			// Verify request body.
			body, _ := io.ReadAll(r.Body)
			var req openapi.RegisteredModelCreate
			if err := json.Unmarshal(body, &req); err != nil {
				t.Errorf("failed to unmarshal request body: %v", err)
			}
			if req.Name != "my-model" {
				t.Errorf("expected model name 'my-model', got %q", req.Name)
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			resp := openapi.RegisteredModel{Id: &modelID, Name: "my-model"}
			json.NewEncoder(w).Encode(resp)
		}))
		defer server.Close()

		client := NewModelRegistryClient(server.Client())
		result, err := client.CreateRegisteredModel(
			context.Background(),
			validBaseURL(server.URL),
			openapi.RegisteredModelCreate{Name: "my-model"},
		)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result == nil {
			t.Fatal("expected non-nil result")
		}
		if *result.Id != modelID {
			t.Errorf("expected ID %q, got %q", modelID, *result.Id)
		}
		if result.Name != "my-model" {
			t.Errorf("expected name 'my-model', got %q", result.Name)
		}
	})

	t.Run("HTTP error response", func(t *testing.T) {
		server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusConflict)
			json.NewEncoder(w).Encode(ErrorResponse{Code: "CONFLICT", Message: "model already exists"})
		}))
		defer server.Close()

		client := NewModelRegistryClient(server.Client())
		_, err := client.CreateRegisteredModel(
			context.Background(),
			validBaseURL(server.URL),
			openapi.RegisteredModelCreate{Name: "dup-model"},
		)
		if err == nil {
			t.Fatal("expected error for conflict response")
		}
		var httpErr *HTTPError
		if !errors.As(err, &httpErr) {
			t.Fatalf("expected HTTPError, got %T: %v", err, err)
		}
		if httpErr.StatusCode != http.StatusConflict {
			t.Errorf("expected status 409, got %d", httpErr.StatusCode)
		}
	})

	t.Run("invalid JSON response", func(t *testing.T) {
		server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusCreated)
			w.Write([]byte("not-json"))
		}))
		defer server.Close()

		client := NewModelRegistryClient(server.Client())
		_, err := client.CreateRegisteredModel(
			context.Background(),
			validBaseURL(server.URL),
			openapi.RegisteredModelCreate{Name: "test"},
		)
		if err == nil {
			t.Fatal("expected error for invalid JSON response")
		}
		if !strings.Contains(err.Error(), "decoding") {
			t.Errorf("expected decoding error, got: %v", err)
		}
	})

	t.Run("invalid base URL", func(t *testing.T) {
		client := NewModelRegistryClient(http.DefaultClient)
		_, err := client.CreateRegisteredModel(
			context.Background(),
			"http://insecure.example.com/api/model_registry/v1",
			openapi.RegisteredModelCreate{Name: "test"},
		)
		if err == nil {
			t.Fatal("expected error for HTTP URL")
		}
		if !strings.Contains(err.Error(), "HTTPS") {
			t.Errorf("expected HTTPS error, got: %v", err)
		}
	})
}

// === CreateModelVersion ===

func TestCreateModelVersion(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		versionID := "mv-456"
		server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost {
				t.Errorf("expected POST, got %s", r.Method)
			}
			// Verify path includes model ID and versions.
			if !strings.Contains(r.URL.Path, "/registered_models/rm-123/versions") {
				t.Errorf("unexpected path: %s", r.URL.Path)
			}

			body, _ := io.ReadAll(r.Body)
			var req openapi.ModelVersionCreate
			if err := json.Unmarshal(body, &req); err != nil {
				t.Errorf("failed to unmarshal request body: %v", err)
			}
			if req.Name != "v1" {
				t.Errorf("expected version name 'v1', got %q", req.Name)
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			resp := openapi.ModelVersion{Id: &versionID, Name: "v1"}
			json.NewEncoder(w).Encode(resp)
		}))
		defer server.Close()

		client := NewModelRegistryClient(server.Client())
		result, err := client.CreateModelVersion(
			context.Background(),
			validBaseURL(server.URL),
			"rm-123",
			openapi.ModelVersionCreate{Name: "v1"},
		)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result == nil {
			t.Fatal("expected non-nil result")
		}
		if *result.Id != versionID {
			t.Errorf("expected ID %q, got %q", versionID, *result.Id)
		}
	})

	t.Run("HTTP error response", func(t *testing.T) {
		server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Code: "BAD_REQUEST", Message: "invalid version"})
		}))
		defer server.Close()

		client := NewModelRegistryClient(server.Client())
		_, err := client.CreateModelVersion(
			context.Background(),
			validBaseURL(server.URL),
			"rm-123",
			openapi.ModelVersionCreate{Name: ""},
		)
		if err == nil {
			t.Fatal("expected error")
		}
		var httpErr *HTTPError
		if !errors.As(err, &httpErr) {
			t.Fatalf("expected HTTPError, got %T: %v", err, err)
		}
		if httpErr.StatusCode != http.StatusBadRequest {
			t.Errorf("expected status 400, got %d", httpErr.StatusCode)
		}
	})

	t.Run("invalid base URL", func(t *testing.T) {
		client := NewModelRegistryClient(http.DefaultClient)
		_, err := client.CreateModelVersion(
			context.Background(),
			"https://example.com/wrong/path",
			"rm-123",
			openapi.ModelVersionCreate{Name: "v1"},
		)
		if err == nil {
			t.Fatal("expected error for missing path segment")
		}
	})
}

// === CreateModelArtifact ===

func TestCreateModelArtifact(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		artifactID := "ma-789"
		server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost {
				t.Errorf("expected POST, got %s", r.Method)
			}
			if !strings.Contains(r.URL.Path, "/model_versions/mv-456/artifacts") {
				t.Errorf("unexpected path: %s", r.URL.Path)
			}

			body, _ := io.ReadAll(r.Body)
			var req openapi.ModelArtifactCreate
			if err := json.Unmarshal(body, &req); err != nil {
				t.Errorf("failed to unmarshal request body: %v", err)
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			resp := openapi.ModelArtifact{Id: &artifactID}
			json.NewEncoder(w).Encode(resp)
		}))
		defer server.Close()

		client := NewModelRegistryClient(server.Client())
		artifactName := "my-artifact"
		result, err := client.CreateModelArtifact(
			context.Background(),
			validBaseURL(server.URL),
			"mv-456",
			openapi.ModelArtifactCreate{Name: &artifactName},
		)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result == nil {
			t.Fatal("expected non-nil result")
		}
		if *result.Id != artifactID {
			t.Errorf("expected ID %q, got %q", artifactID, *result.Id)
		}
	})

	t.Run("default artifact type set when nil", func(t *testing.T) {
		server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			body, _ := io.ReadAll(r.Body)
			var req openapi.ModelArtifactCreate
			if err := json.Unmarshal(body, &req); err != nil {
				t.Errorf("failed to unmarshal: %v", err)
			}
			if req.ArtifactType == nil || *req.ArtifactType != DefaultArtifactType {
				t.Errorf("expected artifact type %q, got %v", DefaultArtifactType, req.ArtifactType)
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			id := "ma-1"
			json.NewEncoder(w).Encode(openapi.ModelArtifact{Id: &id})
		}))
		defer server.Close()

		client := NewModelRegistryClient(server.Client())
		_, err := client.CreateModelArtifact(
			context.Background(),
			validBaseURL(server.URL),
			"mv-1",
			openapi.ModelArtifactCreate{}, // ArtifactType is nil
		)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("preserves explicit artifact type", func(t *testing.T) {
		customType := "custom-type"
		server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			body, _ := io.ReadAll(r.Body)
			var req openapi.ModelArtifactCreate
			json.Unmarshal(body, &req)
			if req.ArtifactType == nil || *req.ArtifactType != customType {
				t.Errorf("expected artifact type %q, got %v", customType, req.ArtifactType)
			}

			w.WriteHeader(http.StatusCreated)
			id := "ma-1"
			json.NewEncoder(w).Encode(openapi.ModelArtifact{Id: &id})
		}))
		defer server.Close()

		client := NewModelRegistryClient(server.Client())
		_, err := client.CreateModelArtifact(
			context.Background(),
			validBaseURL(server.URL),
			"mv-1",
			openapi.ModelArtifactCreate{ArtifactType: &customType},
		)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("HTTP error response", func(t *testing.T) {
		server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("internal error"))
		}))
		defer server.Close()

		client := NewModelRegistryClient(server.Client())
		_, err := client.CreateModelArtifact(
			context.Background(),
			validBaseURL(server.URL),
			"mv-1",
			openapi.ModelArtifactCreate{},
		)
		if err == nil {
			t.Fatal("expected error")
		}
		var httpErr *HTTPError
		if !errors.As(err, &httpErr) {
			t.Fatalf("expected HTTPError, got %T: %v", err, err)
		}
		if httpErr.StatusCode != http.StatusInternalServerError {
			t.Errorf("expected status 500, got %d", httpErr.StatusCode)
		}
	})

	t.Run("invalid JSON response", func(t *testing.T) {
		server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("{broken"))
		}))
		defer server.Close()

		client := NewModelRegistryClient(server.Client())
		_, err := client.CreateModelArtifact(
			context.Background(),
			validBaseURL(server.URL),
			"mv-1",
			openapi.ModelArtifactCreate{},
		)
		if err == nil {
			t.Fatal("expected error for invalid JSON")
		}
		if !strings.Contains(err.Error(), "decoding") {
			t.Errorf("expected decoding error, got: %v", err)
		}
	})
}

// === postJSON ===

func TestPostJSON_StatusOK(t *testing.T) {
	// StatusOK (200) should be accepted alongside StatusCreated (201).
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"id": "test"}`))
	}))
	defer server.Close()

	client := NewModelRegistryClient(server.Client())
	result, err := client.CreateRegisteredModel(
		context.Background(),
		validBaseURL(server.URL),
		openapi.RegisteredModelCreate{Name: "test"},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected non-nil result")
	}
}

// === NewModelRegistryClient ===

func TestNewModelRegistryClient(t *testing.T) {
	client := NewModelRegistryClient(http.DefaultClient)
	if client == nil {
		t.Fatal("expected non-nil client")
	}
}

// === NewDefaultModelRegistryClient ===

func TestNewDefaultModelRegistryClient(t *testing.T) {
	t.Run("basic config", func(t *testing.T) {
		client := NewDefaultModelRegistryClient(ModelRegistryClientConfig{})
		if client == nil {
			t.Fatal("expected non-nil client")
		}
	})

	t.Run("with WrapTransport", func(t *testing.T) {
		wrapped := false
		client := NewDefaultModelRegistryClient(ModelRegistryClientConfig{
			WrapTransport: func(rt http.RoundTripper) http.RoundTripper {
				wrapped = true
				return rt
			},
		})
		if client == nil {
			t.Fatal("expected non-nil client")
		}
		if !wrapped {
			t.Error("expected WrapTransport to be called")
		}
	})

	t.Run("with InsecureSkipVerify", func(t *testing.T) {
		client := NewDefaultModelRegistryClient(ModelRegistryClientConfig{
			InsecureSkipVerify: true,
		})
		if client == nil {
			t.Fatal("expected non-nil client")
		}
	})
}

// === Compile-time interface checks ===

func TestInterfaceCompliance(t *testing.T) {
	// These are compile-time checks already in the source, but verifying
	// the concrete types implement the interfaces.
	var _ ModelRegistryClientInterface = (*ModelRegistryClient)(nil)
	var _ httpClientInterface = (*http.Client)(nil)
}
