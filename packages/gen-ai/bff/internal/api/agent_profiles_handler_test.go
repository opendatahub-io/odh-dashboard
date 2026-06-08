package api

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestCreateAgentProfileHandler(t *testing.T) {
	testNamespace := "test-namespace"

	minimalSpec := models.AgentProfileSpec{
		DisplayName: "Simple Agent",
		Model: models.ModelReference{
			ID:  "llama-3-8b",
			URI: "https://api.example.com/v1/models",
		},
	}

	tests := []struct {
		name           string
		requestBody    models.AgentProfileCreateRequest
		namespace      string
		existingCM     *corev1.ConfigMap
		wantStatusCode int
		validateFunc   func(t *testing.T, responseBody []byte)
	}{
		{
			name: "successful creation",
			requestBody: models.AgentProfileCreateRequest{
				Spec: minimalSpec,
			},
			namespace:      testNamespace,
			wantStatusCode: http.StatusCreated,
			validateFunc: func(t *testing.T, responseBody []byte) {
				var envelope AgentProfileCreateEnvelope
				err := json.Unmarshal(responseBody, &envelope)
				require.NoError(t, err)

				// ConfigMap name should have prefix + UUID
				assert.Contains(t, envelope.Data.Name, "agent-profile-")
				assert.NotEmpty(t, envelope.Data.ProfileID)
				assert.Equal(t, "Simple Agent", envelope.Data.DisplayName)
				assert.Equal(t, testNamespace, envelope.Data.Namespace)
				assert.NotEmpty(t, envelope.Data.ResourceVersion)

				// ProfileID should be a valid UUID (36 chars with hyphens)
				assert.Len(t, envelope.Data.ProfileID, 36)
			},
		},
		// Note: "already exists" is now nearly impossible since we use UUIDs
		// But we keep the test for edge cases where UUID collision could theoretically happen
		{
			name: "invalid profile - missing display name",
			requestBody: models.AgentProfileCreateRequest{
				Spec: models.AgentProfileSpec{
					Model: models.ModelReference{
						ID:  "llama-3-8b",
						URI: "https://api.example.com/v1/models",
					},
				},
			},
			namespace:      testNamespace,
			wantStatusCode: http.StatusBadRequest,
			validateFunc: func(t *testing.T, responseBody []byte) {
				var envelope ErrorEnvelope
				err := json.Unmarshal(responseBody, &envelope)
				require.NoError(t, err)

				assert.Equal(t, "400", envelope.Error.Code)
				assert.Contains(t, envelope.Error.Message, "displayName is required")
			},
		},
		// Note: apiVersion and kind are now set by the server, so no invalid version test needed
		{
			name: "missing namespace",
			requestBody: models.AgentProfileCreateRequest{
				Spec: minimalSpec,
			},
			namespace:      "", // Empty namespace
			wantStatusCode: http.StatusBadRequest,
			validateFunc: func(t *testing.T, responseBody []byte) {
				var envelope ErrorEnvelope
				err := json.Unmarshal(responseBody, &envelope)
				require.NoError(t, err)

				assert.Equal(t, "400", envelope.Error.Code)
				assert.Contains(t, envelope.Error.Message, "namespace")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create fake Kubernetes client
			scheme := runtime.NewScheme()
			_ = corev1.AddToScheme(scheme)

			var objects []client.Object
			if tt.existingCM != nil {
				objects = append(objects, tt.existingCM)
			}

			fakeK8sClient := fake.NewClientBuilder().
				WithScheme(scheme).
				WithObjects(objects...).
				Build()

			// Create K8s client factory
			restConfig := &rest.Config{
				Host: "https://test-cluster.example.com",
			}
			k8sFactory, err := k8smocks.NewTokenClientFactory(fakeK8sClient, restConfig, slog.Default())
			require.NoError(t, err)

			// Create app with mock factory
			app := App{
				config:                  config.EnvConfig{},
				logger:                  slog.Default(),
				kubernetesClientFactory: k8sFactory,
				repositories:            &repositories.Repositories{},
			}

			// Prepare request
			bodyBytes, err := json.Marshal(tt.requestBody)
			require.NoError(t, err)

			req := httptest.NewRequest(http.MethodPost, "/api/v1/agent-profiles", bytes.NewReader(bodyBytes))
			req.Header.Set("Content-Type", "application/json")

			// Add namespace to context
			ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, tt.namespace)
			// Add request identity for auth
			ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
				Token: "test-token",
			})
			req = req.WithContext(ctx)

			// Execute request
			rr := httptest.NewRecorder()
			app.CreateAgentProfileHandler(rr, req, httprouter.Params{})

			// Validate status code
			rs := rr.Result()
			defer func() { _ = rs.Body.Close() }()

			// Validate response body
			responseBody, err := io.ReadAll(rs.Body)
			require.NoError(t, err)

			// Debug output
			if rs.StatusCode != tt.wantStatusCode {
				t.Logf("Response status: %d, body: %s", rs.StatusCode, string(responseBody))
			} else if testing.Verbose() {
				t.Logf("Response body: %s", string(responseBody))
			}

			assert.Equal(t, tt.wantStatusCode, rs.StatusCode)

			if tt.validateFunc != nil {
				tt.validateFunc(t, responseBody)
			}
		})
	}
}
