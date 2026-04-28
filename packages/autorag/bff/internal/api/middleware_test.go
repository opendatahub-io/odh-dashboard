package api

import (
	"context"
	"crypto/x509"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"net/url"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes/k8smocks"
	ls "github.com/opendatahub-io/autorag-library/bff/internal/integrations/llamastack"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
)

const (
	testNamespace = "test-namespace"
)

// CapturingMockClientFactory wraps the standard mock factory to capture URLs
// used when creating clients, for verification in tests.
type CapturingMockClientFactory struct {
	CapturedURL string
}

func (f *CapturingMockClientFactory) CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) ls.LlamaStackClientInterface {
	f.CapturedURL = baseURL
	return lsmocks.NewMockLlamaStackClient()
}

func TestAttachNamespace(t *testing.T) {
	t.Run("should return 400 when namespace query parameter is missing", func(t *testing.T) {
		app := App{}

		req := httptest.NewRequest("GET", "/api/v1/lsd/models", nil) // no ?namespace=
		rr := httptest.NewRecorder()

		app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called when namespace is missing")
		})(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "missing required query parameter")
	})

	t.Run("should attach namespace to context and call next when namespace is present", func(t *testing.T) {
		app := App{}

		req := httptest.NewRequest("GET", "/api/v1/lsd/models?namespace=my-namespace", nil)
		rr := httptest.NewRecorder()

		var capturedNamespace string
		app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			capturedNamespace = r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
			w.WriteHeader(http.StatusOK)
		})(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "my-namespace", capturedNamespace)
	})
}

func TestAttachLlamaStackClientFromSecret(t *testing.T) {
	t.Run("should return 400 when secretName query parameter is missing", func(t *testing.T) {
		app := App{
			llamaStackClientFactory: lsmocks.NewMockClientFactory(),
			repositories:            repositories.NewRepositories(slog.Default()),
		}

		req := httptest.NewRequest("GET", "/api/v1/lsd/models", nil)
		req = req.WithContext(context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, testNamespace))
		rr := httptest.NewRecorder()

		app.AttachLlamaStackClientFromSecret(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "missing required query parameter: secretName")
	})

	t.Run("should return 400 when secretName is invalid DNS-1123 label", func(t *testing.T) {
		app := App{
			llamaStackClientFactory: lsmocks.NewMockClientFactory(),
			repositories:            repositories.NewRepositories(slog.Default()),
		}

		req := httptest.NewRequest("GET", "/api/v1/lsd/models?secretName=INVALID_NAME", nil)
		req = req.WithContext(context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, testNamespace))
		rr := httptest.NewRecorder()

		app.AttachLlamaStackClientFromSecret(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "invalid secretName")
	})

	t.Run("should attach mock client when MockLSClient is true", func(t *testing.T) {
		app := App{
			config:                  config.EnvConfig{MockLSClient: true},
			llamaStackClientFactory: lsmocks.NewMockClientFactory(),
			repositories:            repositories.NewRepositories(slog.Default()),
		}

		req := httptest.NewRequest("GET", "/api/v1/lsd/models?secretName=my-secret", nil)
		req = req.WithContext(context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, testNamespace))
		rr := httptest.NewRecorder()

		app.AttachLlamaStackClientFromSecret(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			client := r.Context().Value(constants.LlamaStackClientKey)
			assert.NotNil(t, client)
			w.WriteHeader(http.StatusOK)
		})(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
	})

	t.Run("should return error when namespace is missing from context", func(t *testing.T) {
		app := App{
			llamaStackClientFactory: lsmocks.NewMockClientFactory(),
			repositories:            repositories.NewRepositories(slog.Default()),
		}

		req := httptest.NewRequest("GET", "/api/v1/lsd/models?secretName=my-secret", nil)
		rr := httptest.NewRecorder()

		app.AttachLlamaStackClientFromSecret(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "missing namespace in context")
	})
}

func TestIsValidLlamaStackURL(t *testing.T) {
	t.Run("should accept valid http URL with DNS hostname", func(t *testing.T) {
		err := isValidLlamaStackURL("http://llamastack.my-namespace.svc.cluster.local:8321")
		assert.NoError(t, err)
	})

	t.Run("should accept valid https URL", func(t *testing.T) {
		err := isValidLlamaStackURL("https://llamastack.example.com:8321")
		assert.NoError(t, err)
	})

	t.Run("should accept private IP addresses (cluster-internal)", func(t *testing.T) {
		err := isValidLlamaStackURL("http://10.0.0.5:8321")
		assert.NoError(t, err)
	})

	t.Run("should reject non-http/https schemes", func(t *testing.T) {
		err := isValidLlamaStackURL("ftp://llamastack:8321")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid URL scheme")
	})

	t.Run("should reject loopback IPv4 address", func(t *testing.T) {
		err := isValidLlamaStackURL("http://127.0.0.1:8321")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "loopback")
	})

	t.Run("should reject loopback IPv6 address", func(t *testing.T) {
		err := isValidLlamaStackURL("http://[::1]:8321")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "loopback")
	})

	t.Run("should reject cloud metadata endpoint (169.254.169.254)", func(t *testing.T) {
		err := isValidLlamaStackURL("http://169.254.169.254/latest/meta-data/")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "link-local")
	})

	t.Run("should reject other link-local addresses", func(t *testing.T) {
		err := isValidLlamaStackURL("http://169.254.0.1:8321")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "link-local")
	})

	t.Run("should reject unspecified address 0.0.0.0", func(t *testing.T) {
		err := isValidLlamaStackURL("http://0.0.0.0:8321")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unspecified")
	})

	t.Run("should reject URL without host", func(t *testing.T) {
		err := isValidLlamaStackURL("http://")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "must contain a host")
	})

	t.Run("should reject localhost (resolves to loopback)", func(t *testing.T) {
		err := isValidLlamaStackURL("http://localhost:8321")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "loopback")
	})

	t.Run("should allow non-resolving hostname (fails at connection time instead)", func(t *testing.T) {
		// Hostnames that don't resolve are allowed through — they may only be resolvable
		// inside a cluster (e.g., svc.cluster.local). The HTTP client will fail later
		// with a connection error, handled as 502 Bad Gateway.
		err := isValidLlamaStackURL("http://this-hostname-does-not-exist.invalid:8321")
		assert.NoError(t, err)
	})

	t.Run("should block metadata.google.internal if it resolves to link-local", func(t *testing.T) {
		// In OpenShift/CI environments this hostname doesn't resolve, so it passes
		// validation (non-resolving hostnames are allowed through).
		// In GCP environments it would resolve to 169.254.169.254 and be blocked as link-local.
		err := isValidLlamaStackURL("http://metadata.google.internal")
		if err != nil {
			// If it resolved (e.g., in GCP), it should be blocked as link-local
			assert.Contains(t, err.Error(), "link-local")
		}
		// If it didn't resolve (e.g., in OpenShift/CI), no error — that's expected
	})
}

func TestRequireAccessToService(t *testing.T) {
	t.Run("should return bad request when RequestIdentity is missing", func(t *testing.T) {
		app := App{}

		req := httptest.NewRequest("GET", "/api/v1/test", nil)
		rr := httptest.NewRecorder()

		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "missing RequestIdentity in context")
	})

	t.Run("should return bad request when ValidateRequestIdentity fails", func(t *testing.T) {
		mockFactory := k8smocks.NewMockTokenClientFactory()
		app := App{
			kubernetesClientFactory: mockFactory,
		}

		req := httptest.NewRequest("GET", "/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &k8s.RequestIdentity{Token: ""})
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "token is required")
	})

	t.Run("should return server error when k8sClient.GetClient fails", func(t *testing.T) {
		mockFactory := &k8smocks.FailingMockTokenClientFactory{
			GetClientError: assert.AnError,
		}
		app := App{
			kubernetesClientFactory: mockFactory,
			logger:                  slog.Default(),
		}

		req := httptest.NewRequest("GET", "/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &k8s.RequestIdentity{Token: "valid-token"})
		// add a namespace so we enter block to test for namespace access
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, testNamespace)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		// Server errors return generic message (detailed error is logged but not exposed to client)
		assert.Contains(t, rr.Body.String(), "the server encountered a problem")
	})

	t.Run("should return 401 when k8s API returns Unauthorized", func(t *testing.T) {
		mockFactory := &k8smocks.ConfigurableMockTokenClientFactory{
			CanListDSPAError: k8smocks.NewUnauthorizedError(),
		}
		app := App{
			kubernetesClientFactory: mockFactory,
			logger:                  slog.Default(),
		}

		req := httptest.NewRequest("GET", "/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &k8s.RequestIdentity{Token: "invalid-token"})
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, testNamespace)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "authentication failed")
	})

	t.Run("should return 403 when k8s API returns Forbidden", func(t *testing.T) {
		mockFactory := &k8smocks.ConfigurableMockTokenClientFactory{
			CanListDSPAError: k8smocks.NewForbiddenError(),
		}
		app := App{
			kubernetesClientFactory: mockFactory,
			logger:                  slog.Default(),
		}

		req := httptest.NewRequest("GET", "/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &k8s.RequestIdentity{Token: "valid-token"})
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, testNamespace)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusForbidden, rr.Code)
		assert.Contains(t, rr.Body.String(), "insufficient permissions")
	})

	t.Run("should return 403 when user is not allowed to access namespace", func(t *testing.T) {
		mockFactory := &k8smocks.ConfigurableMockTokenClientFactory{
			CanListDSPAAllowed: false, // User not allowed
		}
		app := App{
			kubernetesClientFactory: mockFactory,
			logger:                  slog.Default(),
		}

		req := httptest.NewRequest("GET", "/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &k8s.RequestIdentity{Token: "valid-token"})
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, testNamespace)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusForbidden, rr.Code)
		assert.Contains(t, rr.Body.String(), "user does not have permission to access services in this namespace")
	})

	t.Run("should call next handler when user is allowed to access namespace", func(t *testing.T) {
		mockFactory := &k8smocks.ConfigurableMockTokenClientFactory{
			CanListDSPAAllowed: true, // User allowed
		}
		app := App{
			kubernetesClientFactory: mockFactory,
			logger:                  slog.Default(),
		}

		req := httptest.NewRequest("GET", "/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &k8s.RequestIdentity{Token: "valid-token"})
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, testNamespace)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		handlerCalled := false
		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
		})(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.True(t, handlerCalled, "Next handler should be called when user is authorized")
	})
}

func TestPreserveRawPath(t *testing.T) {
	tests := []struct {
		name           string
		path           string
		rawPath        string
		useStripPrefix bool
		expectedPath   string
	}{
		{
			name:         "s3 files path with percent-encoded key swaps Path for RawPath",
			path:         "/api/v1/s3/files/docs/file.csv",
			rawPath:      "/api/v1/s3/files/docs%2Ffile.csv",
			expectedPath: "/api/v1/s3/files/docs%2Ffile.csv",
		},
		{
			name:         "s3 files path without encoding is unchanged",
			path:         "/api/v1/s3/files/simple.csv",
			rawPath:      "",
			expectedPath: "/api/v1/s3/files/simple.csv",
		},
		{
			name:         "double-encoded key preserves %25 literal via RawPath",
			path:         "/api/v1/s3/files/docs%2Ffile.csv",
			rawPath:      "/api/v1/s3/files/docs%252Ffile.csv",
			expectedPath: "/api/v1/s3/files/docs%252Ffile.csv",
		},
		{
			name:         "double-encoded key re-encodes when RawPath is empty",
			path:         "/api/v1/s3/files/docs%2Ffile.csv",
			rawPath:      "",
			expectedPath: "/api/v1/s3/files/docs%252Ffile.csv",
		},
		{
			name:         "non-s3 path with RawPath is unchanged",
			path:         "/api/v1/lsd/models",
			rawPath:      "/api/v1/lsd/models",
			expectedPath: "/api/v1/lsd/models",
		},
		{
			name:           "prefixed path is matched after StripPrefix removes prefix",
			path:           "/autorag/api/v1/s3/files/docs/file.csv",
			rawPath:        "/autorag/api/v1/s3/files/docs%2Ffile.csv",
			useStripPrefix: true,
			expectedPath:   "/api/v1/s3/files/docs%2Ffile.csv",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var capturedPath string
			inner := http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
				capturedPath = r.URL.Path
			})

			handler := preserveRawPath(inner)
			if tt.useStripPrefix {
				handler = http.StripPrefix(PathPrefix, handler)
			}

			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			req.URL = &url.URL{Path: tt.path, RawPath: tt.rawPath}
			rr := httptest.NewRecorder()

			handler.ServeHTTP(rr, req)

			assert.Equal(t, tt.expectedPath, capturedPath)
		})
	}
}
