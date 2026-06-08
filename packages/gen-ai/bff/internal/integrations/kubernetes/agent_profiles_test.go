package kubernetes

import (
	"context"
	"log/slog"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v2"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestCreateAgentProfile(t *testing.T) {
	testNamespace := "test-namespace"

	tests := []struct {
		name         string
		profile      *models.AgentProfile
		existingCM   *corev1.ConfigMap
		wantErr      bool
		wantErrCode  int
		wantErrMsg   string
		validateFunc func(t *testing.T, response *models.AgentProfileCreateResponse, client client.Client)
	}{
		{
			name: "successful creation - minimal profile",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "550e8400-e29b-41d4-a716-446655440000", // UUID
				},
				Spec: models.AgentProfileSpec{
					DisplayName: "Simple Agent",
					Model: models.ModelReference{
						ID:  "llama-3-8b",
						URI: "https://api.example.com/v1/models",
					},
				},
			},
			wantErr: false,
			validateFunc: func(t *testing.T, response *models.AgentProfileCreateResponse, cl client.Client) {
				assert.Equal(t, "agent-profile-550e8400-e29b-41d4-a716-446655440000", response.Name)
				assert.Equal(t, testNamespace, response.Namespace)
				assert.NotEmpty(t, response.ResourceVersion)

				// Verify ConfigMap was created
				cm := &corev1.ConfigMap{}
				err := cl.Get(context.Background(), client.ObjectKey{
					Namespace: testNamespace,
					Name:      "agent-profile-550e8400-e29b-41d4-a716-446655440000",
				}, cm)
				require.NoError(t, err)

				// Check labels (following ODH Dashboard conventions)
				assert.Equal(t, "true", cm.Labels["opendatahub.io/dashboard"])
				assert.Equal(t, "true", cm.Labels["opendatahub.io/agent-profile"])

				// Check profile YAML
				profileYAML, ok := cm.Data["profile.yaml"]
				require.True(t, ok, "profile.yaml key should exist")

				var profile models.AgentProfile
				err = yaml.Unmarshal([]byte(profileYAML), &profile)
				require.NoError(t, err)
				assert.Equal(t, "550e8400-e29b-41d4-a716-446655440000", profile.Metadata.Name)
				assert.Equal(t, "Simple Agent", profile.Spec.DisplayName)
			},
		},
		{
			name: "successful creation - full profile",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "660e8400-e29b-41d4-a716-446655440001", // UUID
				},
				Spec: models.AgentProfileSpec{
					DisplayName: "Advanced Agent",
					Description: "An advanced agent with all features",
					Model: models.ModelReference{
						ID:         "llama-3-70b",
						URI:        "https://api.example.com/v1/models",
						SourceType: "custom_endpoint",
						Authorization: &models.ModelAuthorization{
							CredentialsRef: &models.CredentialsRef{
								Kind: "Secret",
								Name: "api-key-secret",
								Key:  "apiKey",
							},
						},
					},
					Temperature: func() *float64 { v := 0.7; return &v }(),
					Stream:      func() *bool { v := true; return &v }(),
					VectorStores: &models.VectorStoresConfig{
						Stores: []models.VectorStoreRef{
							{
								StoreRef: &models.ConfigMapRef{
									Kind: "ConfigMap",
									Name: "gen-ai-aa-vector-stores",
									Key:  "vs_001",
								},
							},
						},
						MaxNumResults: func() *int { v := 5; return &v }(),
					},
				},
			},
			wantErr: false,
			validateFunc: func(t *testing.T, response *models.AgentProfileCreateResponse, cl client.Client) {
				assert.Equal(t, "agent-profile-660e8400-e29b-41d4-a716-446655440001", response.Name)

				// Verify profile data
				cm := &corev1.ConfigMap{}
				err := cl.Get(context.Background(), client.ObjectKey{
					Namespace: testNamespace,
					Name:      "agent-profile-660e8400-e29b-41d4-a716-446655440001",
				}, cm)
				require.NoError(t, err)

				profileYAML := cm.Data["profile.yaml"]
				var profile models.AgentProfile
				err = yaml.Unmarshal([]byte(profileYAML), &profile)
				require.NoError(t, err)

				assert.Equal(t, "660e8400-e29b-41d4-a716-446655440001", profile.Metadata.Name)
				assert.Equal(t, "Advanced Agent", profile.Spec.DisplayName)
				assert.NotNil(t, profile.Spec.Temperature)
				assert.Equal(t, 0.7, *profile.Spec.Temperature)
				assert.NotNil(t, profile.Spec.VectorStores)
				assert.Len(t, profile.Spec.VectorStores.Stores, 1)
			},
		},
		{
			name: "already exists (UUID collision - extremely rare)",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "770e8400-e29b-41d4-a716-446655440002", // UUID
				},
				Spec: models.AgentProfileSpec{
					DisplayName: "Existing Agent",
					Model: models.ModelReference{
						ID:  "llama-3-8b",
						URI: "https://api.example.com/v1/models",
					},
				},
			},
			existingCM: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "agent-profile-770e8400-e29b-41d4-a716-446655440002",
					Namespace: testNamespace,
				},
				Data: map[string]string{
					"profile.yaml": "dummy",
				},
			},
			wantErr:     true,
			wantErrCode: 409,
			wantErrMsg:  "already_exists",
		},
		{
			name: "invalid apiVersion",
			profile: &models.AgentProfile{
				APIVersion: "invalid/v1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "880e8400-e29b-41d4-a716-446655440003", // UUID
				},
				Spec: models.AgentProfileSpec{
					DisplayName: "Invalid Agent",
					Model: models.ModelReference{
						ID:  "llama-3-8b",
						URI: "https://api.example.com/v1/models",
					},
				},
			},
			wantErr:     true,
			wantErrCode: 400,
			wantErrMsg:  "invalid_request",
		},
		{
			name: "missing display name",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "990e8400-e29b-41d4-a716-446655440004", // UUID
				},
				Spec: models.AgentProfileSpec{
					Model: models.ModelReference{
						ID:  "llama-3-8b",
						URI: "https://api.example.com/v1/models",
					},
				},
			},
			wantErr:     true,
			wantErrCode: 400,
			wantErrMsg:  "invalid_request",
		},
		{
			name: "invalid temperature",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "aa0e8400-e29b-41d4-a716-446655440005", // UUID
				},
				Spec: models.AgentProfileSpec{
					DisplayName: "Bad Temp Agent",
					Model: models.ModelReference{
						ID:  "llama-3-8b",
						URI: "https://api.example.com/v1/models",
					},
					Temperature: func() *float64 { v := 3.0; return &v }(),
				},
			},
			wantErr:     true,
			wantErrCode: 400,
			wantErrMsg:  "invalid_request",
		},
		{
			name: "displayName too long",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "bb0e8400-e29b-41d4-a716-446655440006",
				},
				Spec: models.AgentProfileSpec{
					DisplayName: "This is a very long display name that exceeds the maximum allowed length of 100 characters for agent profiles",
					Model: models.ModelReference{
						ID:  "llama-3-8b",
						URI: "https://api.example.com/v1/models",
					},
				},
			},
			wantErr:     true,
			wantErrCode: 400,
			wantErrMsg:  "invalid_request",
		},
		{
			name: "maxOutputTokens too high",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "cc0e8400-e29b-41d4-a716-446655440007",
				},
				Spec: models.AgentProfileSpec{
					DisplayName: "Token Limit Agent",
					Model: models.ModelReference{
						ID:  "llama-3-8b",
						URI: "https://api.example.com/v1/models",
					},
					MaxOutputTokens: func() *int { v := 50000; return &v }(),
				},
			},
			wantErr:     true,
			wantErrCode: 400,
			wantErrMsg:  "invalid_request",
		},
		{
			name: "maxOutputTokens too low",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "dd0e8400-e29b-41d4-a716-446655440008",
				},
				Spec: models.AgentProfileSpec{
					DisplayName: "Zero Token Agent",
					Model: models.ModelReference{
						ID:  "llama-3-8b",
						URI: "https://api.example.com/v1/models",
					},
					MaxOutputTokens: func() *int { v := 0; return &v }(),
				},
			},
			wantErr:     true,
			wantErrCode: 400,
			wantErrMsg:  "invalid_request",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create fake client
			scheme := runtime.NewScheme()
			_ = corev1.AddToScheme(scheme)

			var objects []client.Object
			if tt.existingCM != nil {
				objects = append(objects, tt.existingCM)
			}

			fakeClient := fake.NewClientBuilder().
				WithScheme(scheme).
				WithObjects(objects...).
				Build()

			kc := &TokenKubernetesClient{
				Client: fakeClient,
				Logger: slog.Default(),
			}

			// Execute
			response, err := kc.CreateAgentProfile(context.Background(), testNamespace, tt.profile)

			// Validate error
			if tt.wantErr {
				require.Error(t, err)
				httpErr, ok := err.(*integrations.HTTPError)
				require.True(t, ok, "error should be HTTPError")
				assert.Equal(t, tt.wantErrCode, httpErr.StatusCode)
				assert.Contains(t, httpErr.Code, tt.wantErrMsg)
				return
			}

			// Validate success
			require.NoError(t, err)
			require.NotNil(t, response)

			if tt.validateFunc != nil {
				tt.validateFunc(t, response, fakeClient)
			}
		})
	}
}

func TestGetAgentProfile(t *testing.T) {
	testNamespace := "test-namespace"

	// Create a test profile
	testProfile := &models.AgentProfile{
		APIVersion: "genai.redhat.com/v1alpha1",
		Kind:       "AgentProfile",
		Metadata: models.AgentProfileMetadata{
			Name: "bb0e8400-e29b-41d4-a716-446655440006", // UUID
		},
		Spec: models.AgentProfileSpec{
			DisplayName: "Test Agent",
			Model: models.ModelReference{
				ID:  "llama-3-8b",
				URI: "https://api.example.com/v1/models",
			},
		},
	}

	profileYAML, err := yaml.Marshal(testProfile)
	require.NoError(t, err)

	tests := []struct {
		name         string
		profileName  string
		existingCM   *corev1.ConfigMap
		wantErr      bool
		wantErrCode  int
		validateFunc func(t *testing.T, profile *models.AgentProfile)
	}{
		{
			name:        "successful retrieval",
			profileName: "bb0e8400-e29b-41d4-a716-446655440006",
			existingCM: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "agent-profile-bb0e8400-e29b-41d4-a716-446655440006",
					Namespace: testNamespace,
					Labels: map[string]string{
						"opendatahub.io/dashboard":     "true",
						"opendatahub.io/agent-profile": "true",
					},
				},
				Data: map[string]string{
					"profile.yaml": string(profileYAML),
				},
			},
			wantErr: false,
			validateFunc: func(t *testing.T, profile *models.AgentProfile) {
				assert.Equal(t, "bb0e8400-e29b-41d4-a716-446655440006", profile.Metadata.Name)
				assert.Equal(t, "Test Agent", profile.Spec.DisplayName)
				assert.Equal(t, "llama-3-8b", profile.Spec.Model.ID)
			},
		},
		{
			name:        "not found",
			profileName: "cc0e8400-e29b-41d4-a716-446655440007",
			wantErr:     true,
			wantErrCode: 404,
		},
		{
			name:        "malformed ConfigMap - missing profile.yaml key",
			profileName: "dd0e8400-e29b-41d4-a716-446655440008",
			existingCM: &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "agent-profile-dd0e8400-e29b-41d4-a716-446655440008",
					Namespace: testNamespace,
				},
				Data: map[string]string{
					"wrong-key": "data",
				},
			},
			wantErr:     true,
			wantErrCode: 500,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create fake client
			scheme := runtime.NewScheme()
			_ = corev1.AddToScheme(scheme)

			var objects []client.Object
			if tt.existingCM != nil {
				objects = append(objects, tt.existingCM)
			}

			fakeClient := fake.NewClientBuilder().
				WithScheme(scheme).
				WithObjects(objects...).
				Build()

			kc := &TokenKubernetesClient{
				Client: fakeClient,
				Logger: slog.Default(),
			}

			// Execute
			profile, err := kc.GetAgentProfile(context.Background(), testNamespace, tt.profileName)

			// Validate error
			if tt.wantErr {
				require.Error(t, err)
				httpErr, ok := err.(*integrations.HTTPError)
				require.True(t, ok, "error should be HTTPError")
				assert.Equal(t, tt.wantErrCode, httpErr.StatusCode)
				return
			}

			// Validate success
			require.NoError(t, err)
			require.NotNil(t, profile)

			if tt.validateFunc != nil {
				tt.validateFunc(t, profile)
			}
		})
	}
}

func TestValidateAgentProfile(t *testing.T) {
	tests := []struct {
		name    string
		profile *models.AgentProfile
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid minimal profile",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "ee0e8400-e29b-41d4-a716-446655440009", // UUID
				},
				Spec: models.AgentProfileSpec{
					DisplayName: "Valid Agent",
					Model: models.ModelReference{
						ID:  "llama-3-8b",
						URI: "https://api.example.com/v1/models",
					},
				},
			},
			wantErr: false,
		},
		{
			name:    "nil profile",
			profile: nil,
			wantErr: true,
			errMsg:  "cannot be nil",
		},
		{
			name: "invalid apiVersion",
			profile: &models.AgentProfile{
				APIVersion: "wrong/v1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "test",
				},
				Spec: models.AgentProfileSpec{
					DisplayName: "Test",
					Model:       models.ModelReference{ID: "m", URI: "u"},
				},
			},
			wantErr: true,
			errMsg:  "invalid apiVersion",
		},
		{
			name: "invalid kind",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "WrongKind",
				Metadata: models.AgentProfileMetadata{
					Name: "test",
				},
				Spec: models.AgentProfileSpec{
					DisplayName: "Test",
					Model:       models.ModelReference{ID: "m", URI: "u"},
				},
			},
			wantErr: true,
			errMsg:  "invalid kind",
		},
		{
			name: "missing metadata.name (UUID)",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "AgentProfile",
				Metadata:   models.AgentProfileMetadata{},
				Spec: models.AgentProfileSpec{
					DisplayName: "Test",
					Model:       models.ModelReference{ID: "m", URI: "u"},
				},
			},
			wantErr: true,
			errMsg:  "metadata.name is required",
		},
		{
			name: "invalid metadata.name (not a UUID)",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "short", // Too short to be a UUID
				},
				Spec: models.AgentProfileSpec{
					DisplayName: "Test",
					Model:       models.ModelReference{ID: "m", URI: "u"},
				},
			},
			wantErr: true,
			errMsg:  "should be a valid UUID",
		},
		{
			name: "missing displayName",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "ff0e8400-e29b-41d4-a716-446655440010", // Valid UUID
				},
				Spec: models.AgentProfileSpec{
					Model: models.ModelReference{ID: "m", URI: "u"},
				},
			},
			wantErr: true,
			errMsg:  "spec.displayName is required",
		},
		{
			name: "temperature too high",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "000e8400-e29b-41d4-a716-446655440011", // Valid UUID
				},
				Spec: models.AgentProfileSpec{
					DisplayName: "Test",
					Model:       models.ModelReference{ID: "m", URI: "u"},
					Temperature: func() *float64 { v := 3.0; return &v }(),
				},
			},
			wantErr: true,
			errMsg:  "temperature must be between 0.0 and 2.0",
		},
		{
			name: "displayName too long",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "111e8400-e29b-41d4-a716-446655440014",
				},
				Spec: models.AgentProfileSpec{
					DisplayName: "This is a very long display name that exceeds the maximum allowed length of 100 characters for agent profiles",
					Model:       models.ModelReference{ID: "m", URI: "u"},
				},
			},
			wantErr: true,
			errMsg:  "displayName must be 100 characters or less",
		},
		{
			name: "maxOutputTokens too high",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "222e8400-e29b-41d4-a716-446655440015",
				},
				Spec: models.AgentProfileSpec{
					DisplayName:     "Test",
					Model:           models.ModelReference{ID: "m", URI: "u"},
					MaxOutputTokens: func() *int { v := 50000; return &v }(),
				},
			},
			wantErr: true,
			errMsg:  "maxOutputTokens must be between 1 and 32000",
		},
		{
			name: "maxOutputTokens zero",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "333e8400-e29b-41d4-a716-446655440016",
				},
				Spec: models.AgentProfileSpec{
					DisplayName:     "Test",
					Model:           models.ModelReference{ID: "m", URI: "u"},
					MaxOutputTokens: func() *int { v := 0; return &v }(),
				},
			},
			wantErr: true,
			errMsg:  "maxOutputTokens must be between 1 and 32000",
		},
		{
			name: "vector store - empty stores array",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "100e8400-e29b-41d4-a716-446655440011",
				},
				Spec: models.AgentProfileSpec{
					DisplayName: "Test",
					Model:       models.ModelReference{ID: "m", URI: "u"},
					VectorStores: &models.VectorStoresConfig{
						Stores: []models.VectorStoreRef{},
					},
				},
			},
			wantErr: true,
			errMsg:  "must contain at least one item",
		},
		{
			name: "vector store - both storeRef and id set",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "110e8400-e29b-41d4-a716-446655440012", // Valid UUID
				},
				Spec: models.AgentProfileSpec{
					DisplayName: "Test",
					Model:       models.ModelReference{ID: "m", URI: "u"},
					VectorStores: &models.VectorStoresConfig{
						Stores: []models.VectorStoreRef{
							{
								StoreRef: &models.ConfigMapRef{Kind: "ConfigMap", Name: "test", Key: "key"},
								ID:       "vs-001",
							},
						},
					},
				},
			},
			wantErr: true,
			errMsg:  "exactly one of storeRef or id must be set",
		},
		{
			name: "MCP server - missing key for ConfigMap",
			profile: &models.AgentProfile{
				APIVersion: "genai.redhat.com/v1alpha1",
				Kind:       "AgentProfile",
				Metadata: models.AgentProfileMetadata{
					Name: "220e8400-e29b-41d4-a716-446655440013", // Valid UUID
				},
				Spec: models.AgentProfileSpec{
					DisplayName: "Test",
					Model:       models.ModelReference{ID: "m", URI: "u"},
					MCPServers: []models.MCPServerReference{
						{
							ServerRef: models.MCPServerRef{
								Kind: "ConfigMap",
								Name: "mcp-servers",
								// Key missing
							},
						},
					},
				},
			},
			wantErr: true,
			errMsg:  "serverRef.key is required when kind is ConfigMap",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateAgentProfile(tt.profile)

			if tt.wantErr {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.errMsg)
			} else {
				require.NoError(t, err)
			}
		})
	}
}
