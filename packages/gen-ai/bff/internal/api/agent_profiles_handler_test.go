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
	"time"

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
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
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

				assert.Equal(t, "invalid_request", envelope.Error.Code)
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

				assert.Equal(t, "missing_namespace", envelope.Error.Code)
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

func TestListAgentProfilesHandler(t *testing.T) {
	testNamespace := "test-namespace"

	// Helper function to create an agent profile ConfigMap
	createAgentProfileConfigMap := func(name, displayName, description string) *corev1.ConfigMap {
		profileYAML := `apiVersion: genai.redhat.com/v1alpha1
kind: AgentProfile
metadata:
  name: ` + name + `
spec:
  displayName: ` + displayName + `
  description: ` + description + `
  model:
    id: llama-3-8b
    uri: https://api.example.com/v1/models
`
		// Parse a sample timestamp for CreationTimestamp
		timestamp, _ := time.Parse(time.RFC3339, "2024-01-15T10:30:00Z")

		return &corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "agent-profile-" + name,
				Namespace: testNamespace,
				Labels: map[string]string{
					"opendatahub.io/dashboard":     "true",
					"opendatahub.io/agent-profile": "true",
				},
				CreationTimestamp: metav1.NewTime(timestamp),
			},
			Data: map[string]string{
				"profile.yaml": profileYAML,
			},
		}
	}

	tests := []struct {
		name           string
		namespace      string
		existingCMs    []*corev1.ConfigMap
		wantStatusCode int
		validateFunc   func(t *testing.T, responseBody []byte)
	}{
		{
			name:           "empty list - no profiles",
			namespace:      testNamespace,
			existingCMs:    []*corev1.ConfigMap{},
			wantStatusCode: http.StatusOK,
			validateFunc: func(t *testing.T, responseBody []byte) {
				var envelope AgentProfileListEnvelope
				err := json.Unmarshal(responseBody, &envelope)
				require.NoError(t, err)

				assert.Equal(t, 0, envelope.Data.TotalCount)
				assert.Len(t, envelope.Data.Profiles, 0)
			},
		},
		{
			name:      "list with single profile",
			namespace: testNamespace,
			existingCMs: []*corev1.ConfigMap{
				createAgentProfileConfigMap(
					"550e8400-e29b-41d4-a716-446655440000",
					"Customer Support Agent",
					"Professional customer support agent",
				),
			},
			wantStatusCode: http.StatusOK,
			validateFunc: func(t *testing.T, responseBody []byte) {
				var envelope AgentProfileListEnvelope
				err := json.Unmarshal(responseBody, &envelope)
				require.NoError(t, err)

				assert.Equal(t, 1, envelope.Data.TotalCount)
				assert.Len(t, envelope.Data.Profiles, 1)

				profile := envelope.Data.Profiles[0]
				assert.Equal(t, "agent-profile-550e8400-e29b-41d4-a716-446655440000", profile.Name)
				assert.Equal(t, "550e8400-e29b-41d4-a716-446655440000", profile.ProfileID)
				assert.Equal(t, "Customer Support Agent", profile.DisplayName)
				assert.Equal(t, "Professional customer support agent", profile.Description)
				assert.Equal(t, testNamespace, profile.Namespace)
				assert.NotEmpty(t, profile.LastModified)
			},
		},
		{
			name:      "list with multiple profiles",
			namespace: testNamespace,
			existingCMs: []*corev1.ConfigMap{
				createAgentProfileConfigMap(
					"550e8400-e29b-41d4-a716-446655440000",
					"Customer Support Agent",
					"Professional customer support agent",
				),
				createAgentProfileConfigMap(
					"7c1e5f23-9a8b-4d12-b3c6-789012345678",
					"Code Assistant",
					"",
				),
			},
			wantStatusCode: http.StatusOK,
			validateFunc: func(t *testing.T, responseBody []byte) {
				var envelope AgentProfileListEnvelope
				err := json.Unmarshal(responseBody, &envelope)
				require.NoError(t, err)

				assert.Equal(t, 2, envelope.Data.TotalCount)
				assert.Len(t, envelope.Data.Profiles, 2)

				// Verify both profiles are present
				profileIDs := []string{
					envelope.Data.Profiles[0].ProfileID,
					envelope.Data.Profiles[1].ProfileID,
				}
				assert.Contains(t, profileIDs, "550e8400-e29b-41d4-a716-446655440000")
				assert.Contains(t, profileIDs, "7c1e5f23-9a8b-4d12-b3c6-789012345678")
			},
		},
		{
			name:      "skip ConfigMap with invalid name format",
			namespace: testNamespace,
			existingCMs: []*corev1.ConfigMap{
				createAgentProfileConfigMap(
					"550e8400-e29b-41d4-a716-446655440000",
					"Valid Profile",
					"This should be included",
				),
				{
					// ConfigMap with wrong name format (missing prefix)
					ObjectMeta: metav1.ObjectMeta{
						Name:      "invalid-name-format",
						Namespace: testNamespace,
						Labels: map[string]string{
							"opendatahub.io/dashboard":     "true",
							"opendatahub.io/agent-profile": "true",
						},
					},
					Data: map[string]string{
						"profile.yaml": `apiVersion: genai.redhat.com/v1alpha1
kind: AgentProfile
metadata:
  name: test-id
spec:
  displayName: Should Be Skipped
  model:
    id: llama-3-8b
    uri: https://api.example.com/v1/models
`,
					},
				},
			},
			wantStatusCode: http.StatusOK,
			validateFunc: func(t *testing.T, responseBody []byte) {
				var envelope AgentProfileListEnvelope
				err := json.Unmarshal(responseBody, &envelope)
				require.NoError(t, err)

				// Should only include the valid profile, skipping the invalid one
				assert.Equal(t, 1, envelope.Data.TotalCount)
				assert.Len(t, envelope.Data.Profiles, 1)
				assert.Equal(t, "Valid Profile", envelope.Data.Profiles[0].DisplayName)
			},
		},
		{
			name:      "skip ConfigMap with invalid UUID suffix",
			namespace: testNamespace,
			existingCMs: []*corev1.ConfigMap{
				createAgentProfileConfigMap(
					"550e8400-e29b-41d4-a716-446655440000",
					"Valid Profile",
					"This should be included",
				),
				{
					// ConfigMap with correct prefix but invalid UUID
					ObjectMeta: metav1.ObjectMeta{
						Name:      "agent-profile-not-a-valid-uuid",
						Namespace: testNamespace,
						Labels: map[string]string{
							"opendatahub.io/dashboard":     "true",
							"opendatahub.io/agent-profile": "true",
						},
					},
					Data: map[string]string{
						"profile.yaml": `apiVersion: genai.redhat.com/v1alpha1
kind: AgentProfile
metadata:
  name: not-a-valid-uuid
spec:
  displayName: Should Be Skipped
  model:
    id: llama-3-8b
    uri: https://api.example.com/v1/models
`,
					},
				},
			},
			wantStatusCode: http.StatusOK,
			validateFunc: func(t *testing.T, responseBody []byte) {
				var envelope AgentProfileListEnvelope
				err := json.Unmarshal(responseBody, &envelope)
				require.NoError(t, err)

				// Should only include the valid profile, skipping the one with bad UUID
				assert.Equal(t, 1, envelope.Data.TotalCount)
				assert.Len(t, envelope.Data.Profiles, 1)
				assert.Equal(t, "Valid Profile", envelope.Data.Profiles[0].DisplayName)
			},
		},
		{
			name:           "missing namespace",
			namespace:      "", // Empty namespace
			existingCMs:    []*corev1.ConfigMap{},
			wantStatusCode: http.StatusBadRequest,
			validateFunc: func(t *testing.T, responseBody []byte) {
				var envelope ErrorEnvelope
				err := json.Unmarshal(responseBody, &envelope)
				require.NoError(t, err)

				assert.Equal(t, "missing_namespace", envelope.Error.Code)
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
			for _, cm := range tt.existingCMs {
				objects = append(objects, cm)
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
			req := httptest.NewRequest(http.MethodGet, "/api/v1/agent-profiles", nil)

			// Add namespace to context
			ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, tt.namespace)
			// Add request identity for auth
			ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
				Token: "test-token",
			})
			req = req.WithContext(ctx)

			// Execute request
			rr := httptest.NewRecorder()
			app.ListAgentProfilesHandler(rr, req, httprouter.Params{})

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

func TestGetAgentProfileHandler(t *testing.T) {
	testNamespace := "test-namespace"
	profileID := "550e8400-e29b-41d4-a716-446655440000"

	// Helper to create a ConfigMap for testing
	createTestConfigMap := func() *corev1.ConfigMap {
		profileYAML := `apiVersion: genai.redhat.com/v1alpha1
kind: AgentProfile
metadata:
  name: 550e8400-e29b-41d4-a716-446655440000
spec:
  displayName: Test Agent
  description: Test description
  model:
    id: llama-3-8b
    uri: https://api.example.com/v1/models
`
		return &corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{
				Name:            "agent-profile-550e8400-e29b-41d4-a716-446655440000",
				Namespace:       testNamespace,
				ResourceVersion: "12345",
				Labels: map[string]string{
					"opendatahub.io/dashboard":     "true",
					"opendatahub.io/agent-profile": "true",
				},
			},
			Data: map[string]string{
				"profile.yaml": profileYAML,
			},
		}
	}

	tests := []struct {
		name           string
		profileID      string
		namespace      string
		existingCM     *corev1.ConfigMap
		wantStatusCode int
		validateFunc   func(t *testing.T, responseBody []byte)
	}{
		{
			name:           "successful GET",
			profileID:      profileID,
			namespace:      testNamespace,
			existingCM:     createTestConfigMap(),
			wantStatusCode: http.StatusOK,
			validateFunc: func(t *testing.T, responseBody []byte) {
				var envelope AgentProfileEnvelope
				err := json.Unmarshal(responseBody, &envelope)
				require.NoError(t, err)

				assert.Equal(t, "genai.redhat.com/v1alpha1", envelope.Data.APIVersion)
				assert.Equal(t, "AgentProfile", envelope.Data.Kind)
				assert.Equal(t, profileID, envelope.Data.Metadata.Name)
				assert.Equal(t, "12345", envelope.Data.Metadata.ResourceVersion)
				assert.Equal(t, "Test Agent", envelope.Data.Spec.DisplayName)
				assert.Equal(t, "Test description", envelope.Data.Spec.Description)
			},
		},
		{
			name:           "not found",
			profileID:      "00000000-0000-0000-0000-000000000000",
			namespace:      testNamespace,
			existingCM:     nil,
			wantStatusCode: http.StatusNotFound,
			validateFunc: func(t *testing.T, responseBody []byte) {
				var envelope ErrorEnvelope
				err := json.Unmarshal(responseBody, &envelope)
				require.NoError(t, err)
				assert.Equal(t, "404", envelope.Error.Code)
			},
		},
		{
			name:           "missing namespace",
			profileID:      profileID,
			namespace:      "",
			existingCM:     nil,
			wantStatusCode: http.StatusBadRequest,
			validateFunc: func(t *testing.T, responseBody []byte) {
				var envelope ErrorEnvelope
				err := json.Unmarshal(responseBody, &envelope)
				require.NoError(t, err)
				assert.Contains(t, envelope.Error.Message, "namespace")
			},
		},
		{
			name:           "invalid UUID format",
			profileID:      "not-a-uuid",
			namespace:      testNamespace,
			existingCM:     nil,
			wantStatusCode: http.StatusBadRequest,
			validateFunc: func(t *testing.T, responseBody []byte) {
				var envelope ErrorEnvelope
				err := json.Unmarshal(responseBody, &envelope)
				require.NoError(t, err)
				assert.Equal(t, "invalid_id", envelope.Error.Code)
				assert.Contains(t, envelope.Error.Message, "UUID")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
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

			restConfig := &rest.Config{
				Host: "https://test-cluster.example.com",
			}
			k8sFactory, err := k8smocks.NewTokenClientFactory(fakeK8sClient, restConfig, slog.Default())
			require.NoError(t, err)

			app := App{
				config:                  config.EnvConfig{},
				logger:                  slog.Default(),
				kubernetesClientFactory: k8sFactory,
				repositories:            &repositories.Repositories{},
			}

			req := httptest.NewRequest(http.MethodGet, "/api/v1/agent-profiles/"+tt.profileID, nil)

			ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, tt.namespace)
			ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
				Token: "test-token",
			})
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			params := httprouter.Params{{Key: "id", Value: tt.profileID}}
			app.GetAgentProfileHandler(rr, req, params)

			rs := rr.Result()
			defer func() { _ = rs.Body.Close() }()

			responseBody, err := io.ReadAll(rs.Body)
			require.NoError(t, err)

			assert.Equal(t, tt.wantStatusCode, rs.StatusCode)

			if tt.validateFunc != nil {
				tt.validateFunc(t, responseBody)
			}
		})
	}
}

func TestUpdateAgentProfileHandler(t *testing.T) {
	testNamespace := "test-namespace"
	profileID := "550e8400-e29b-41d4-a716-446655440000"

	createTestConfigMap := func(resourceVersion string) *corev1.ConfigMap {
		profileYAML := `apiVersion: genai.redhat.com/v1alpha1
kind: AgentProfile
metadata:
  name: 550e8400-e29b-41d4-a716-446655440000
spec:
  displayName: Old Agent
  model:
    id: llama-3-8b
    uri: https://api.example.com/v1/models
`
		return &corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{
				Name:            "agent-profile-550e8400-e29b-41d4-a716-446655440000",
				Namespace:       testNamespace,
				ResourceVersion: resourceVersion,
				Labels: map[string]string{
					"opendatahub.io/dashboard":     "true",
					"opendatahub.io/agent-profile": "true",
				},
			},
			Data: map[string]string{
				"profile.yaml": profileYAML,
			},
		}
	}

	tests := []struct {
		name           string
		profileID      string
		namespace      string
		requestBody    models.AgentProfileUpdateRequest
		existingCM     *corev1.ConfigMap
		wantStatusCode int
		validateFunc   func(t *testing.T, responseBody []byte)
	}{
		{
			name:      "successful update",
			profileID: profileID,
			namespace: testNamespace,
			requestBody: models.AgentProfileUpdateRequest{
				Spec: models.AgentProfileSpec{
					DisplayName: "Updated Agent",
					Model: models.ModelReference{
						ID:  "llama-3-70b",
						URI: "https://api.example.com/v1/models",
					},
				},
				ResourceVersion: "12345",
			},
			existingCM:     createTestConfigMap("12345"),
			wantStatusCode: http.StatusOK,
			validateFunc: func(t *testing.T, responseBody []byte) {
				var envelope AgentProfileUpdateEnvelope
				err := json.Unmarshal(responseBody, &envelope)
				require.NoError(t, err)

				assert.Contains(t, envelope.Data.Name, "agent-profile-")
				assert.Equal(t, profileID, envelope.Data.ProfileID)
				assert.Equal(t, "Updated Agent", envelope.Data.DisplayName)
				assert.NotEmpty(t, envelope.Data.ResourceVersion)
			},
		},
		{
			name:      "resource version conflict",
			profileID: profileID,
			namespace: testNamespace,
			requestBody: models.AgentProfileUpdateRequest{
				Spec: models.AgentProfileSpec{
					DisplayName: "Updated Agent",
					Model: models.ModelReference{
						ID:  "llama-3-70b",
						URI: "https://api.example.com/v1/models",
					},
				},
				ResourceVersion: "12345",
			},
			existingCM:     createTestConfigMap("99999"), // Different version
			wantStatusCode: http.StatusConflict,
			validateFunc: func(t *testing.T, responseBody []byte) {
				var envelope ErrorEnvelope
				err := json.Unmarshal(responseBody, &envelope)
				require.NoError(t, err)
				assert.Equal(t, "conflict", envelope.Error.Code)
				assert.Contains(t, envelope.Error.Message, "conflict")
			},
		},
		{
			name:      "not found",
			profileID: "00000000-0000-0000-0000-000000000000",
			namespace: testNamespace,
			requestBody: models.AgentProfileUpdateRequest{
				Spec: models.AgentProfileSpec{
					DisplayName: "Updated Agent",
					Model: models.ModelReference{
						ID:  "llama-3-70b",
						URI: "https://api.example.com/v1/models",
					},
				},
				ResourceVersion: "12345",
			},
			existingCM:     nil,
			wantStatusCode: http.StatusNotFound,
			validateFunc: func(t *testing.T, responseBody []byte) {
				var envelope ErrorEnvelope
				err := json.Unmarshal(responseBody, &envelope)
				require.NoError(t, err)
				assert.Equal(t, "404", envelope.Error.Code)
			},
		},
		{
			name:      "invalid UUID format",
			profileID: "not-a-uuid",
			namespace: testNamespace,
			requestBody: models.AgentProfileUpdateRequest{
				Spec: models.AgentProfileSpec{
					DisplayName: "Updated Agent",
					Model: models.ModelReference{
						ID:  "llama-3-70b",
						URI: "https://api.example.com/v1/models",
					},
				},
				ResourceVersion: "12345",
			},
			existingCM:     nil,
			wantStatusCode: http.StatusBadRequest,
			validateFunc: func(t *testing.T, responseBody []byte) {
				var envelope ErrorEnvelope
				err := json.Unmarshal(responseBody, &envelope)
				require.NoError(t, err)
				assert.Equal(t, "invalid_id", envelope.Error.Code)
				assert.Contains(t, envelope.Error.Message, "UUID")
			},
		},
		{
			name:      "update with nil ConfigMap Data field",
			profileID: profileID,
			namespace: testNamespace,
			requestBody: models.AgentProfileUpdateRequest{
				Spec: models.AgentProfileSpec{
					DisplayName: "Updated Agent",
					Model: models.ModelReference{
						ID:  "llama-3-70b",
						URI: "https://api.example.com/v1/models",
					},
				},
				ResourceVersion: "12345",
			},
			existingCM: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:            "agent-profile-550e8400-e29b-41d4-a716-446655440000",
					Namespace:       testNamespace,
					ResourceVersion: "12345",
					Labels: map[string]string{
						"opendatahub.io/dashboard":     "true",
						"opendatahub.io/agent-profile": "true",
					},
				},
				Data: nil, // Nil Data map to test defensive nil guard
			},
			wantStatusCode: http.StatusOK,
			validateFunc: func(t *testing.T, responseBody []byte) {
				var envelope AgentProfileUpdateEnvelope
				err := json.Unmarshal(responseBody, &envelope)
				require.NoError(t, err)

				assert.Contains(t, envelope.Data.Name, "agent-profile-")
				assert.Equal(t, profileID, envelope.Data.ProfileID)
				assert.Equal(t, "Updated Agent", envelope.Data.DisplayName)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
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

			restConfig := &rest.Config{
				Host: "https://test-cluster.example.com",
			}
			k8sFactory, err := k8smocks.NewTokenClientFactory(fakeK8sClient, restConfig, slog.Default())
			require.NoError(t, err)

			app := App{
				config:                  config.EnvConfig{},
				logger:                  slog.Default(),
				kubernetesClientFactory: k8sFactory,
				repositories:            &repositories.Repositories{},
			}

			bodyBytes, err := json.Marshal(tt.requestBody)
			require.NoError(t, err)

			req := httptest.NewRequest(http.MethodPut, "/api/v1/agent-profiles/"+tt.profileID, bytes.NewReader(bodyBytes))
			req.Header.Set("Content-Type", "application/json")

			ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, tt.namespace)
			ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
				Token: "test-token",
			})
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			params := httprouter.Params{{Key: "id", Value: tt.profileID}}
			app.UpdateAgentProfileHandler(rr, req, params)

			rs := rr.Result()
			defer func() { _ = rs.Body.Close() }()

			responseBody, err := io.ReadAll(rs.Body)
			require.NoError(t, err)

			assert.Equal(t, tt.wantStatusCode, rs.StatusCode)

			if tt.validateFunc != nil {
				tt.validateFunc(t, responseBody)
			}
		})
	}
}

func TestDeleteAgentProfileHandler(t *testing.T) {
	testNamespace := "test-namespace"
	profileID := "550e8400-e29b-41d4-a716-446655440000"

	createTestConfigMap := func() *corev1.ConfigMap {
		profileYAML := `apiVersion: genai.redhat.com/v1alpha1
kind: AgentProfile
metadata:
  name: 550e8400-e29b-41d4-a716-446655440000
spec:
  displayName: Test Agent
  model:
    id: llama-3-8b
    uri: https://api.example.com/v1/models
`
		return &corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "agent-profile-550e8400-e29b-41d4-a716-446655440000",
				Namespace: testNamespace,
				Labels: map[string]string{
					"opendatahub.io/dashboard":     "true",
					"opendatahub.io/agent-profile": "true",
				},
			},
			Data: map[string]string{
				"profile.yaml": profileYAML,
			},
		}
	}

	tests := []struct {
		name           string
		profileID      string
		namespace      string
		existingCM     *corev1.ConfigMap
		wantStatusCode int
	}{
		{
			name:           "successful delete",
			profileID:      profileID,
			namespace:      testNamespace,
			existingCM:     createTestConfigMap(),
			wantStatusCode: http.StatusNoContent,
		},
		{
			name:           "not found",
			profileID:      "00000000-0000-0000-0000-000000000000",
			namespace:      testNamespace,
			existingCM:     nil,
			wantStatusCode: http.StatusNotFound,
		},
		{
			name:           "missing namespace",
			profileID:      profileID,
			namespace:      "",
			existingCM:     nil,
			wantStatusCode: http.StatusBadRequest,
		},
		{
			name:           "invalid UUID format",
			profileID:      "not-a-uuid",
			namespace:      testNamespace,
			existingCM:     nil,
			wantStatusCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
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

			restConfig := &rest.Config{
				Host: "https://test-cluster.example.com",
			}
			k8sFactory, err := k8smocks.NewTokenClientFactory(fakeK8sClient, restConfig, slog.Default())
			require.NoError(t, err)

			app := App{
				config:                  config.EnvConfig{},
				logger:                  slog.Default(),
				kubernetesClientFactory: k8sFactory,
				repositories:            &repositories.Repositories{},
			}

			req := httptest.NewRequest(http.MethodDelete, "/api/v1/agent-profiles/"+tt.profileID, nil)

			ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, tt.namespace)
			ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
				Token: "test-token",
			})
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			params := httprouter.Params{{Key: "id", Value: tt.profileID}}
			app.DeleteAgentProfileHandler(rr, req, params)

			rs := rr.Result()
			defer func() { _ = rs.Body.Close() }()

			assert.Equal(t, tt.wantStatusCode, rs.StatusCode)
		})
	}
}
