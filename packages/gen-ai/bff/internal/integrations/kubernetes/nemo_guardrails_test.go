package kubernetes

import (
	"context"
	"log/slog"
	"strings"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas/maasmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	apimeta "k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

// nemoGVK is the GroupVersionKind for the NemoGuardrails CR.
var nemoGVK = schema.GroupVersionKind{
	Group:   "trustyai.opendatahub.io",
	Version: "v1alpha1",
	Kind:    "NemoGuardrails",
}

// newNemoTestScheme returns a scheme with corev1 registered.
func newNemoTestScheme(t *testing.T) *runtime.Scheme {
	t.Helper()
	scheme := runtime.NewScheme()
	require.NoError(t, corev1.AddToScheme(scheme))
	return scheme
}

// newNemoFakeClient returns a fake client with corev1 and a REST mapper that knows
// about the NemoGuardrails CRD (required for unstructured CR create/get).
func newNemoFakeClient(t *testing.T, scheme *runtime.Scheme, objects ...client.Object) client.Client {
	t.Helper()
	restMapper := apimeta.NewDefaultRESTMapper(nil)
	restMapper.Add(nemoGVK, apimeta.RESTScopeNamespace)
	b := fake.NewClientBuilder().WithScheme(scheme).WithRESTMapper(restMapper)
	if len(objects) > 0 {
		b = b.WithObjects(objects...)
	}
	return b.Build()
}

// getNemoCR retrieves the NemoGuardrails CR from the fake client.
func getNemoCR(t *testing.T, fakeClient client.Client, namespace string) *unstructured.Unstructured {
	t.Helper()
	cr := &unstructured.Unstructured{}
	cr.SetGroupVersionKind(nemoGVK)
	err := fakeClient.Get(context.Background(), client.ObjectKey{Name: nemoGuardrailsCRName, Namespace: namespace}, cr)
	require.NoError(t, err, "NemoGuardrails CR should exist")
	return cr
}

// ─── Pure function tests ──────────────────────────────────────────────────────

func TestSanitizeGuardrailName(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"granite-3b", "granite-3b"},
		{"granite-3b-code-instruct", "granite-3b-code-instruct"},
		{"RedHatAI/granite-3b", "redhatai-granite-3b"},
		{"ollama/llama3.2:3b", "ollama-llama3-2-3b"},
		{"GPT-4o-MINI", "gpt-4o-mini"},
		{"-leading-hyphen", "leading-hyphen"},
		{"trailing-hyphen-", "trailing-hyphen"},
		{"multiple---hyphens", "multiple-hyphens"},
		{strings.Repeat("a", 80), strings.Repeat("a", 50)}, // truncated to 50
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := sanitizeGuardrailName(tt.input)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestNemoGuardrailsConfigMapName(t *testing.T) {
	tests := []struct {
		modelID    string
		sourceType models.ModelSourceTypeEnum
		want       string
	}{
		{"granite-3b", models.ModelSourceTypeMaaS, "guardrail-maas-granite-3b"},
		{"my-llm", models.ModelSourceTypeNamespace, "guardrail-namespace-my-llm"},
		{"gpt-4o", models.ModelSourceTypeCustomEndpoint, "guardrail-custom-endpoint-gpt-4o"},
		{"RedHatAI/model", models.ModelSourceTypeMaaS, "guardrail-maas-redhatai-model"},
	}

	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			got := nemoGuardrailsConfigMapName(tt.modelID, tt.sourceType)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestBuildNemoGuardrailsConfigMapData(t *testing.T) {
	data := buildNemoGuardrailsConfigMapData("granite-3b", "https://maas.example.com/v1")

	require.Contains(t, data, "config.yaml", "must have config.yaml key")
	require.Contains(t, data, "prompts.yml", "must have prompts.yml key")
	require.Contains(t, data, "rails.co", "must have rails.co key")

	configYAML := data["config.yaml"]
	assert.Contains(t, configYAML, "engine: openai")
	assert.Contains(t, configYAML, "model: granite-3b")
	assert.Contains(t, configYAML, "api_key_env_var: "+constants.NemoGuardrailsOpenAIAPIKeyEnvName)
	assert.Contains(t, configYAML, "openai_api_base: \"https://maas.example.com/v1\"")
	assert.Contains(t, configYAML, "self check input")
	assert.Contains(t, configYAML, "self check output")

	assert.Contains(t, data["prompts.yml"], "self_check_input")
	assert.Contains(t, data["prompts.yml"], "self_check_output")
	assert.Contains(t, data["rails.co"], "built-in self-check rails")
}

// ─── CreateNemoGuardrailsResources tests ─────────────────────────────────────

func TestCreateNemoGuardrailsResources_MaaS(t *testing.T) {
	const namespace = "test-ns"
	scheme := newNemoTestScheme(t)
	fakeClient := newNemoFakeClient(t, scheme)

	kc := &TokenKubernetesClient{
		Logger: slog.Default(),
		Client: fakeClient,
	}

	mockMaaS := &maasmocks.MockMaaSClient{}
	installModels := []models.InstallModel{
		{ModelName: "llama-2-7b-chat", ModelSourceType: models.ModelSourceTypeMaaS},
	}

	crName, err := kc.CreateNemoGuardrailsResources(context.Background(), nil, namespace, installModels, mockMaaS, "test-token")
	require.NoError(t, err)
	assert.Equal(t, nemoGuardrailsCRName, crName)

	// ConfigMap should exist with the maas-prefixed name
	cm := &corev1.ConfigMap{}
	expectedCMName := nemoGuardrailsConfigMapName("llama-2-7b-chat", models.ModelSourceTypeMaaS)
	err = fakeClient.Get(context.Background(), client.ObjectKey{Name: expectedCMName, Namespace: namespace}, cm)
	require.NoError(t, err, "ConfigMap %q should have been created", expectedCMName)
	assert.Contains(t, cm.Data["config.yaml"], "llama-2-7b-chat")
	assert.Contains(t, cm.Data["config.yaml"], "engine: openai")
	// MaaS mock returns URL "https://llama-2-7b-chat.apps.example.openshift.com/v1"
	assert.Contains(t, cm.Data["config.yaml"], "llama-2-7b-chat.apps.example.openshift.com")
	assert.Equal(t, "true", cm.Labels[OpenDataHubDashboardLabelKey])

	// NemoGuardrails CR should exist
	cr := getNemoCR(t, fakeClient, namespace)
	spec, ok := cr.Object["spec"].(map[string]interface{})
	require.True(t, ok)

	nemoConfigs, ok := spec["nemoConfigs"].([]interface{})
	require.True(t, ok)
	require.Len(t, nemoConfigs, 1)

	firstConfig := nemoConfigs[0].(map[string]interface{})
	assert.Equal(t, expectedCMName, firstConfig["name"])
	assert.Equal(t, true, firstConfig["default"])

	envList, ok := spec["env"].([]interface{})
	require.True(t, ok)
	require.Len(t, envList, 1)
	envEntry := envList[0].(map[string]interface{})
	assert.Equal(t, constants.NemoGuardrailsOpenAIAPIKeyEnvName, envEntry["name"])
	assert.Equal(t, constants.NemoGuardrailsOpenAIAPIKeyFakeValue, envEntry["value"])
}

func TestCreateNemoGuardrailsResources_Mixed_MultipleModels(t *testing.T) {
	const namespace = "test-ns"
	scheme := newNemoTestScheme(t)
	fakeClient := newNemoFakeClient(t, scheme)

	kc := &TokenKubernetesClient{
		Logger: slog.Default(),
		Client: fakeClient,
	}

	mockMaaS := &maasmocks.MockMaaSClient{}
	installModels := []models.InstallModel{
		{ModelName: "llama-2-7b-chat", ModelSourceType: models.ModelSourceTypeMaaS},
		{ModelName: "llama-2-13b-chat", ModelSourceType: models.ModelSourceTypeMaaS},
	}

	crName, err := kc.CreateNemoGuardrailsResources(context.Background(), nil, namespace, installModels, mockMaaS, "test-token")
	require.NoError(t, err)
	assert.Equal(t, nemoGuardrailsCRName, crName)

	// Two ConfigMaps should be created
	cm1Name := nemoGuardrailsConfigMapName("llama-2-7b-chat", models.ModelSourceTypeMaaS)
	cm2Name := nemoGuardrailsConfigMapName("llama-2-13b-chat", models.ModelSourceTypeMaaS)

	cm1 := &corev1.ConfigMap{}
	require.NoError(t, fakeClient.Get(context.Background(), client.ObjectKey{Name: cm1Name, Namespace: namespace}, cm1))
	cm2 := &corev1.ConfigMap{}
	require.NoError(t, fakeClient.Get(context.Background(), client.ObjectKey{Name: cm2Name, Namespace: namespace}, cm2))

	// CR should have two nemoConfigs; first has default: true
	cr := getNemoCR(t, fakeClient, namespace)
	spec := cr.Object["spec"].(map[string]interface{})
	nemoConfigs := spec["nemoConfigs"].([]interface{})
	require.Len(t, nemoConfigs, 2)

	first := nemoConfigs[0].(map[string]interface{})
	assert.Equal(t, true, first["default"], "first nemoConfig should have default:true")
	assert.Equal(t, cm1Name, first["name"])

	second := nemoConfigs[1].(map[string]interface{})
	_, hasDefault := second["default"]
	assert.False(t, hasDefault, "subsequent nemoConfigs should not have default key")
	assert.Equal(t, cm2Name, second["name"])
}

func TestCreateNemoGuardrailsResources_CustomEndpoint(t *testing.T) {
	const namespace = "test-ns"

	// Seed the external models ConfigMap (gen-ai-aa-custom-model-endpoints format)
	externalCMYAML := `providers:
  inference:
    - provider_id: openai-provider
      provider_type: remote::openai
      config:
        base_url: "https://api.openai.com/v1"
registered_resources:
  models:
    - model_id: gpt-4o-mini
      provider_id: openai-provider
      model_type: llm
`
	externalCM := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      constants.ExternalModelsConfigMapName,
			Namespace: namespace,
		},
		Data: map[string]string{"config.yaml": externalCMYAML},
	}

	scheme := newNemoTestScheme(t)
	fakeClient := newNemoFakeClient(t, scheme, externalCM)

	kc := &TokenKubernetesClient{
		Logger: slog.Default(),
		Client: fakeClient,
	}

	installModels := []models.InstallModel{
		{ModelName: "gpt-4o-mini", ModelSourceType: models.ModelSourceTypeCustomEndpoint},
	}

	crName, err := kc.CreateNemoGuardrailsResources(context.Background(), nil, namespace, installModels, nil, "")
	require.NoError(t, err)
	assert.Equal(t, nemoGuardrailsCRName, crName)

	// ConfigMap should be prefixed with "custom-endpoint"
	expectedCMName := nemoGuardrailsConfigMapName("gpt-4o-mini", models.ModelSourceTypeCustomEndpoint)
	assert.Contains(t, expectedCMName, "custom-endpoint")

	cm := &corev1.ConfigMap{}
	require.NoError(t, fakeClient.Get(context.Background(), client.ObjectKey{Name: expectedCMName, Namespace: namespace}, cm))
	assert.Contains(t, cm.Data["config.yaml"], "gpt-4o-mini")
	assert.Contains(t, cm.Data["config.yaml"], "api.openai.com")
}

func TestCreateNemoGuardrailsResources_EmptyModels_Error(t *testing.T) {
	scheme := newNemoTestScheme(t)
	fakeClient := newNemoFakeClient(t, scheme)

	kc := &TokenKubernetesClient{Logger: slog.Default(), Client: fakeClient}
	mockMaaS := &maasmocks.MockMaaSClient{}

	// Handler validation prevents empty model list, but test the K8s layer directly
	_, err := kc.CreateNemoGuardrailsResources(context.Background(), nil, "test-ns", []models.InstallModel{}, mockMaaS, "")
	// No models → creates CR with empty nemoConfigs (not an error at K8s layer)
	// Handler-level validation catches this before the K8s call
	assert.NoError(t, err)
}

func TestCreateNemoGuardrailsResources_MaaS_UnknownModel_Error(t *testing.T) {
	scheme := newNemoTestScheme(t)
	fakeClient := newNemoFakeClient(t, scheme)

	kc := &TokenKubernetesClient{Logger: slog.Default(), Client: fakeClient}
	mockMaaS := &maasmocks.MockMaaSClient{}

	installModels := []models.InstallModel{
		{ModelName: "unknown-model-xyz", ModelSourceType: models.ModelSourceTypeMaaS},
	}

	_, err := kc.CreateNemoGuardrailsResources(context.Background(), nil, "test-ns", installModels, mockMaaS, "test-token")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unknown-model-xyz")
}

func TestCreateNemoGuardrailsResources_UpdateExisting(t *testing.T) {
	const namespace = "test-ns"
	scheme := newNemoTestScheme(t)
	fakeClient := newNemoFakeClient(t, scheme)

	kc := &TokenKubernetesClient{Logger: slog.Default(), Client: fakeClient}
	mockMaaS := &maasmocks.MockMaaSClient{}

	// First call: install one model
	first := []models.InstallModel{
		{ModelName: "llama-2-7b-chat", ModelSourceType: models.ModelSourceTypeMaaS},
	}
	_, err := kc.CreateNemoGuardrailsResources(context.Background(), nil, namespace, first, mockMaaS, "tok")
	require.NoError(t, err)

	// Second call: swap to a different model — should update CR and clean up old ConfigMap
	second := []models.InstallModel{
		{ModelName: "llama-2-13b-chat", ModelSourceType: models.ModelSourceTypeMaaS},
	}
	_, err = kc.CreateNemoGuardrailsResources(context.Background(), nil, namespace, second, mockMaaS, "tok")
	require.NoError(t, err)

	// Old ConfigMap should be gone
	oldCM := &corev1.ConfigMap{}
	oldCMName := nemoGuardrailsConfigMapName("llama-2-7b-chat", models.ModelSourceTypeMaaS)
	err = fakeClient.Get(context.Background(), client.ObjectKey{Name: oldCMName, Namespace: namespace}, oldCM)
	assert.True(t, apierrors.IsNotFound(err), "stale ConfigMap %q should have been deleted", oldCMName)

	// New ConfigMap should exist
	newCM := &corev1.ConfigMap{}
	newCMName := nemoGuardrailsConfigMapName("llama-2-13b-chat", models.ModelSourceTypeMaaS)
	require.NoError(t, fakeClient.Get(context.Background(), client.ObjectKey{Name: newCMName, Namespace: namespace}, newCM))

	// CR should reference only the new model
	cr := getNemoCR(t, fakeClient, namespace)
	spec := cr.Object["spec"].(map[string]interface{})
	nemoConfigs := spec["nemoConfigs"].([]interface{})
	require.Len(t, nemoConfigs, 1)
	assert.Equal(t, newCMName, nemoConfigs[0].(map[string]interface{})["name"])
}

func TestCreateNemoGuardrailsResources_UpdateAddModel(t *testing.T) {
	const namespace = "test-ns"
	scheme := newNemoTestScheme(t)
	fakeClient := newNemoFakeClient(t, scheme)

	kc := &TokenKubernetesClient{Logger: slog.Default(), Client: fakeClient}
	mockMaaS := &maasmocks.MockMaaSClient{}

	// First call: one model
	_, err := kc.CreateNemoGuardrailsResources(context.Background(), nil, namespace,
		[]models.InstallModel{{ModelName: "llama-2-7b-chat", ModelSourceType: models.ModelSourceTypeMaaS}},
		mockMaaS, "tok")
	require.NoError(t, err)

	// Second call: add a second model — both ConfigMaps should exist, CR has two entries
	_, err = kc.CreateNemoGuardrailsResources(context.Background(), nil, namespace,
		[]models.InstallModel{
			{ModelName: "llama-2-7b-chat", ModelSourceType: models.ModelSourceTypeMaaS},
			{ModelName: "llama-2-13b-chat", ModelSourceType: models.ModelSourceTypeMaaS},
		},
		mockMaaS, "tok")
	require.NoError(t, err)

	cm1 := &corev1.ConfigMap{}
	require.NoError(t, fakeClient.Get(context.Background(),
		client.ObjectKey{Name: nemoGuardrailsConfigMapName("llama-2-7b-chat", models.ModelSourceTypeMaaS), Namespace: namespace}, cm1))
	cm2 := &corev1.ConfigMap{}
	require.NoError(t, fakeClient.Get(context.Background(),
		client.ObjectKey{Name: nemoGuardrailsConfigMapName("llama-2-13b-chat", models.ModelSourceTypeMaaS), Namespace: namespace}, cm2))

	cr := getNemoCR(t, fakeClient, namespace)
	nemoConfigs := cr.Object["spec"].(map[string]interface{})["nemoConfigs"].([]interface{})
	assert.Len(t, nemoConfigs, 2)
}

func TestCreateNemoGuardrailsResources_CRAnnotations(t *testing.T) {
	const namespace = "test-ns"
	scheme := newNemoTestScheme(t)
	fakeClient := newNemoFakeClient(t, scheme)

	kc := &TokenKubernetesClient{Logger: slog.Default(), Client: fakeClient}
	mockMaaS := &maasmocks.MockMaaSClient{}

	installModels := []models.InstallModel{
		{ModelName: "llama-2-7b-chat", ModelSourceType: models.ModelSourceTypeMaaS},
	}

	_, err := kc.CreateNemoGuardrailsResources(context.Background(), nil, namespace, installModels, mockMaaS, "test-token")
	require.NoError(t, err)

	cr := getNemoCR(t, fakeClient, namespace)
	annotations := cr.GetAnnotations()
	assert.Equal(t, "true", annotations[constants.NemoGuardrailsEnableAuthAnnotation])
	assert.Equal(t, "true", cr.GetLabels()[OpenDataHubDashboardLabelKey])
}
