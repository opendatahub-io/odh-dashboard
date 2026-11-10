package kubernetes

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	authnv1 "k8s.io/api/authentication/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

func TestTokenClientFactory_ForwardsUserToken(t *testing.T) {
	var capturedToken string

	factory := &TokenClientFactory{
		Logger: slog.Default(),
		Header: config.DefaultAuthTokenHeader,
		Prefix: config.DefaultAuthTokenPrefix,
		NewTokenKubernetesClientFn: func(ctx context.Context, token string, logger *slog.Logger) (KubernetesClientInterface, error) {
			capturedToken = token
			return nil, nil
		},
	}

	userToken := "user-specific-bearer-token-abc123"
	identity := &RequestIdentity{
		UserID: "test-user",
		Token:  NewBearerToken(userToken),
	}

	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, identity)
	_, _ = factory.GetClient(ctx)

	assert.Equal(t, userToken, capturedToken, "factory must forward the user's bearer token, not an SA token")
}

func TestTokenClientFactory_DifferentUsersGetDifferentTokens(t *testing.T) {
	var tokens []string

	factory := &TokenClientFactory{
		Logger: slog.Default(),
		Header: config.DefaultAuthTokenHeader,
		Prefix: config.DefaultAuthTokenPrefix,
		NewTokenKubernetesClientFn: func(ctx context.Context, token string, logger *slog.Logger) (KubernetesClientInterface, error) {
			tokens = append(tokens, token)
			return nil, nil
		},
	}

	for _, token := range []string{"token-user-A", "token-user-B", "token-user-C"} {
		identity := &RequestIdentity{Token: NewBearerToken(token)}
		ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, identity)
		_, _ = factory.GetClient(ctx)
	}

	require.Len(t, tokens, 3)
	assert.Equal(t, "token-user-A", tokens[0])
	assert.Equal(t, "token-user-B", tokens[1])
	assert.Equal(t, "token-user-C", tokens[2])
}

func TestTokenClientFactory_MissingIdentityReturnsError(t *testing.T) {
	factory := &TokenClientFactory{
		Logger: slog.Default(),
		Header: config.DefaultAuthTokenHeader,
		Prefix: config.DefaultAuthTokenPrefix,
	}

	ctx := context.Background()
	client, err := factory.GetClient(ctx)

	assert.Nil(t, client)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "missing RequestIdentity")
}

func TestTokenClientFactory_EmptyTokenReturnsError(t *testing.T) {
	factory := &TokenClientFactory{
		Logger: slog.Default(),
		Header: config.DefaultAuthTokenHeader,
		Prefix: config.DefaultAuthTokenPrefix,
	}

	identity := &RequestIdentity{Token: NewBearerToken("")}
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, identity)
	client, err := factory.GetClient(ctx)

	assert.Nil(t, client)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid or missing identity token")
}

func TestExtractRequestIdentity_ParsesBearerToken(t *testing.T) {
	factory := &TokenClientFactory{
		Logger: slog.Default(),
		Header: config.DefaultAuthTokenHeader,
		Prefix: config.DefaultAuthTokenPrefix,
	}

	header := http.Header{}
	header.Set(config.DefaultAuthTokenHeader, "my-token-value")

	identity, err := factory.ExtractRequestIdentity(header)
	require.NoError(t, err)
	assert.Equal(t, "my-token-value", identity.Token.Raw())
}

func TestExtractRequestIdentity_MissingHeaderReturnsError(t *testing.T) {
	factory := &TokenClientFactory{
		Logger: slog.Default(),
		Header: config.DefaultAuthTokenHeader,
		Prefix: config.DefaultAuthTokenPrefix,
	}

	_, err := factory.ExtractRequestIdentity(http.Header{})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "missing required header")
}

func TestNewTokenKubernetesClient_ConfiguresOnlyBearerTokenAuth(t *testing.T) {
	// Write a minimal kubeconfig so NewTokenKubernetesClient can load a base config.
	// No real connection is made - kubernetes.NewForConfig only configures the client.
	kubeconfig := `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://127.0.0.1:6443
    insecure-skip-tls-verify: true
  name: test
contexts:
- context:
    cluster: test
    user: test
  name: test
current-context: test
users:
- name: test
  user:
    token: sa-token-that-must-be-stripped
`
	tmpDir := t.TempDir()
	kubeconfigPath := filepath.Join(tmpDir, "kubeconfig")
	require.NoError(t, os.WriteFile(kubeconfigPath, []byte(kubeconfig), 0600))
	t.Setenv("KUBECONFIG", kubeconfigPath)

	userToken := "user-bearer-token-xyz789" //nolint:gosec // test fixture, not a real credential
	client, err := NewTokenKubernetesClient(context.Background(), userToken, slog.Default())
	require.NoError(t, err)

	tkc, ok := client.(*TokenKubernetesClient)
	require.True(t, ok)

	assert.Equal(t, userToken, tkc.RestConfig.BearerToken, "rest.Config must carry the user's bearer token")
	assert.Empty(t, tkc.RestConfig.BearerTokenFile, "BearerTokenFile must be cleared")
	assert.Empty(t, tkc.RestConfig.Username, "Username must be cleared")
	assert.Empty(t, tkc.RestConfig.Password, "Password must be cleared")
	assert.Nil(t, tkc.RestConfig.ExecProvider, "ExecProvider must be cleared")
	assert.Nil(t, tkc.RestConfig.AuthProvider, "AuthProvider must be cleared")
	assert.Equal(t, userToken, tkc.Token.Raw(), "Token field must match the user's bearer token")
}

func TestNewTokenKubernetesClient_ForwardsUserTokenOnAPICall(t *testing.T) {
	userToken := "integration-test-user-token-abc123"

	var mu sync.Mutex
	var capturedAuthHeader string

	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		capturedAuthHeader = r.Header.Get("Authorization")
		mu.Unlock()

		resp := authnv1.SelfSubjectReview{
			TypeMeta: metav1.TypeMeta{Kind: "SelfSubjectReview", APIVersion: "authentication.k8s.io/v1"},
			Status: authnv1.SelfSubjectReviewStatus{
				UserInfo: authnv1.UserInfo{Username: "test-user"},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	cfg := &rest.Config{
		Host: server.URL,
		TLSClientConfig: rest.TLSClientConfig{
			Insecure: true,
		},
		BearerToken: userToken,
	}

	clientset, err := kubernetes.NewForConfig(cfg)
	require.NoError(t, err)

	client := &TokenKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client:     clientset,
			Logger:     slog.Default(),
			RestConfig: cfg,
			Token:      NewBearerToken(userToken),
		},
	}

	username, err := client.GetUser(context.Background(), nil)
	require.NoError(t, err)
	assert.Equal(t, "test-user", username)

	mu.Lock()
	defer mu.Unlock()
	assert.Equal(t, "Bearer "+userToken, capturedAuthHeader,
		"K8s API call must carry the user's bearer token, not an SA token")
}

func TestAccessReviewEvaluationDiagnostics(t *testing.T) {
	for _, tc := range []struct {
		name      string
		granted   bool
		forbidden bool
	}{
		{"allowed with diagnostic", true, false},
		{"denied with diagnostic", false, false},
		{"review request forbidden", false, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var logs bytes.Buffer
			logger := slog.New(slog.NewJSONHandler(&logs, &slog.HandlerOptions{Level: slog.LevelDebug}))
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				if tc.forbidden {
					w.WriteHeader(http.StatusForbidden)
					_, _ = w.Write([]byte(`{"apiVersion":"v1","kind":"Status","status":"Failure","code":403,"reason":"Forbidden","message":"CANARY"}`))
					return
				}
				_, _ = fmt.Fprintf(w, `{"apiVersion":"authorization.k8s.io/v1","kind":"SelfSubjectAccessReview","status":{"allowed":%t,"evaluationError":"CANARY"}}`, tc.granted)
			}))
			defer server.Close()
			clientset, err := kubernetes.NewForConfig(&rest.Config{Host: server.URL})
			require.NoError(t, err)
			client := &TokenKubernetesClient{SharedClientLogic: SharedClientLogic{Client: clientset, Logger: logger}}
			for name, check := range map[string]func() (bool, error){
				"cluster-admin": func() (bool, error) { return client.IsClusterAdmin(context.Background(), nil) },
				"admin":         func() (bool, error) { return client.IsUserAdmin(context.Background(), nil) },
				"allowed":       func() (bool, error) { return client.IsUserAllowed(context.Background(), nil) },
				"namespace":     func() (bool, error) { return client.CanGetNamespace(context.Background(), nil, "project") },
				"services":      func() (bool, error) { return client.CanListServicesInNamespace(context.Background(), nil, "project") },
				"service": func() (bool, error) {
					return client.CanAccessServiceInNamespace(context.Background(), nil, "project", "service")
				},
				"resource": func() (bool, error) {
					return client.CheckAccess(context.Background(), nil, "get", "", "pods", "project")
				},
			} {
				t.Run(name, func(t *testing.T) {
					allowed, err := check()
					require.Equal(t, tc.granted, allowed)
					if tc.forbidden {
						require.Error(t, err)
						require.True(t, apierrors.IsForbidden(err))
					} else {
						require.NoError(t, err)
					}
				})
			}
			require.NotContains(t, logs.String(), "CANARY")
			require.NotContains(t, logs.String(), `"error_code":`)
			if tc.forbidden {
				require.Contains(t, logs.String(), `"code":"Forbidden"`)
			}
			if !tc.forbidden {
				var diagnostics int
				for _, line := range strings.Split(strings.TrimSpace(logs.String()), "\n") {
					var entry struct{ Level, Msg string }
					require.NoError(t, json.Unmarshal([]byte(line), &entry))
					if entry.Msg == "access review completed with diagnostic" {
						require.Equal(t, "DEBUG", entry.Level)
						diagnostics++
					}
				}
				require.Positive(t, diagnostics)
			}
		})
	}
}

func TestTokenClientFactoryLogsCurrentAuditID(t *testing.T) {
	for _, fallback := range []bool{false, true} {
		t.Run(fmt.Sprintf("kubeconfig=%v", fallback), func(t *testing.T) {
			audits := []string{"2895b0a0-7694-47d0-8cb4-869b93fe68be", "6d755a02-faea-46ea-ae98-9de9cc8dc4f1"}
			var requests atomic.Int32
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				index := int(requests.Add(1)) - 1
				w.Header().Set(constants.HeaderContentType, constants.ContentTypeJSON)
				w.Header().Set(httpcontract.AuditIDHeader, audits[index%len(audits)])
				w.WriteHeader(http.StatusForbidden)
				_ = json.NewEncoder(w).Encode(metav1.Status{TypeMeta: metav1.TypeMeta{Kind: "Status", APIVersion: "v1"}, Code: 403, Status: metav1.StatusFailure, Reason: metav1.StatusReasonForbidden, Message: "CANARY_SECRET"})
			}))
			defer upstream.Close()
			kubeconfig := fmt.Sprintf(`apiVersion: v1
kind: Config
clusters:
- cluster:
    server: %s
  name: test
contexts:
- context:
    cluster: test
    user: test
  name: test
current-context: test
users:
- name: test
  user:
    token: CANARY_KUBECONFIG_TOKEN
`, upstream.URL)
			path := filepath.Join(t.TempDir(), "kubeconfig")
			require.NoError(t, os.WriteFile(path, []byte(kubeconfig), 0600))
			t.Setenv("KUBECONFIG", path)
			var logs bytes.Buffer
			logger := slog.New(slog.NewJSONHandler(&logs, nil))
			factory := NewTokenClientFactory(logger, config.EnvConfig{})
			handler := httpcontract.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				identity := &RequestIdentity{Token: NewBearerToken("CANARY_USER_TOKEN"), DevFallback: fallback}
				ctx := context.WithValue(r.Context(), constants.RequestIdentityKey, identity)
				client, err := factory.GetClient(ctx)
				require.NoError(t, err)
				for range audits {
					_, err = client.GetUser(ctx, identity)
					require.Error(t, err)
				}
			}), logger)
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/user", nil))
			decoder := json.NewDecoder(strings.NewReader(logs.String()))
			for _, audit := range audits {
				var event struct {
					Message   string `json:"msg"`
					RequestID string `json:"request_id"`
					AuditID   string `json:"upstream_audit_id"`
				}
				require.NoError(t, decoder.Decode(&event))
				require.Equal(t, "failed to get user identity from token", event.Message)
				require.NotEmpty(t, event.RequestID)
				require.Equal(t, response.Header().Get(httpcontract.RequestIDHeader), event.RequestID)
				require.Equal(t, audit, event.AuditID, "read the audit ID after each upstream response")
			}
			var extra any
			require.ErrorIs(t, decoder.Decode(&extra), io.EOF)
			require.Equal(t, int32(2), requests.Load())
			require.NotContains(t, logs.String(), "CANARY")
		})
	}
}
