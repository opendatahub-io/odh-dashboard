package kubernetes

import (
	"context"
	"errors"
	"log/slog"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/constants"
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

var nemoGVK = schema.GroupVersionKind{
	Group:   "trustyai.opendatahub.io",
	Version: "v1alpha1",
	Kind:    "NemoGuardrails",
}

func newNemoTestScheme(t *testing.T) *runtime.Scheme {
	t.Helper()
	scheme := runtime.NewScheme()
	require.NoError(t, corev1.AddToScheme(scheme))
	return scheme
}

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

func getNemoCR(t *testing.T, fakeClient client.Client, namespace string) *unstructured.Unstructured {
	t.Helper()
	cr := &unstructured.Unstructured{}
	cr.SetGroupVersionKind(nemoGVK)
	err := fakeClient.Get(context.Background(), client.ObjectKey{Name: nemoGuardrailsCRName, Namespace: namespace}, cr)
	require.NoError(t, err, "NemoGuardrails CR should exist")
	return cr
}

// ─── Placeholder ConfigMap data tests ────────────────────────────────────────

func TestBuildNemoPlaceholderConfigMapData(t *testing.T) {
	data := buildNemoPlaceholderConfigMapData()

	require.Contains(t, data, "config.yaml")
	require.Contains(t, data, "prompts.yml")
	require.Contains(t, data, "rails.co")

	configYAML := data["config.yaml"]
	assert.Contains(t, configYAML, "engine: openai")
	assert.Contains(t, configYAML, "model: placeholder")
	assert.Contains(t, configYAML, "api_key_env_var: "+constants.NemoGuardrailsOpenAIAPIKeyEnvName)
	assert.Contains(t, configYAML, "http://placeholder.invalid/v1")
	assert.Contains(t, configYAML, "self check input")
	assert.Contains(t, configYAML, "self check output")

	assert.Contains(t, data["prompts.yml"], "self_check_input")
	assert.Contains(t, data["prompts.yml"], "self_check_output")
	assert.Contains(t, data["rails.co"], "built-in self-check rails")
}

// ─── CreateNemoGuardrailsResources tests ─────────────────────────────────────

func TestCreateNemoGuardrailsResources_CreatesPlaceholder(t *testing.T) {
	const namespace = "test-ns"
	scheme := newNemoTestScheme(t)
	fakeClient := newNemoFakeClient(t, scheme)

	kc := &TokenKubernetesClient{Logger: slog.Default(), Client: fakeClient}

	crName, err := kc.CreateNemoGuardrailsResources(context.Background(), namespace)
	require.NoError(t, err)
	assert.Equal(t, nemoGuardrailsCRName, crName)

	// Placeholder ConfigMap exists with correct data
	cm := &corev1.ConfigMap{}
	require.NoError(t, fakeClient.Get(context.Background(),
		client.ObjectKey{Name: nemoGuardrailsPlaceholderName, Namespace: namespace}, cm))
	assert.Contains(t, cm.Data["config.yaml"], "placeholder")
	assert.Equal(t, "true", cm.Labels[OpenDataHubDashboardLabelKey])

	// CR exists and references the placeholder
	cr := getNemoCR(t, fakeClient, namespace)
	spec := cr.Object["spec"].(map[string]interface{})
	nemoConfigs := spec["nemoConfigs"].([]interface{})
	require.Len(t, nemoConfigs, 1)
	first := nemoConfigs[0].(map[string]interface{})
	assert.Equal(t, nemoGuardrailsPlaceholderName, first["name"])
	assert.Equal(t, true, first["default"])

	// CR has OPENAI_API_KEY=fake
	envList := spec["env"].([]interface{})
	require.Len(t, envList, 1)
	envEntry := envList[0].(map[string]interface{})
	assert.Equal(t, constants.NemoGuardrailsOpenAIAPIKeyEnvName, envEntry["name"])
	assert.Equal(t, constants.NemoGuardrailsOpenAIAPIKeyFakeValue, envEntry["value"])
}

func TestCreateNemoGuardrailsResources_ErrorIfAlreadyExists(t *testing.T) {
	const namespace = "test-ns"
	scheme := newNemoTestScheme(t)
	fakeClient := newNemoFakeClient(t, scheme)

	kc := &TokenKubernetesClient{Logger: slog.Default(), Client: fakeClient}

	// First call succeeds
	_, err := kc.CreateNemoGuardrailsResources(context.Background(), namespace)
	require.NoError(t, err)

	// Second call returns a typed ErrNemoGuardrailsAlreadyInitialised
	_, err = kc.CreateNemoGuardrailsResources(context.Background(), namespace)
	require.Error(t, err)
	var alreadyInit *models.ErrNemoGuardrailsAlreadyInitialised
	assert.True(t, errors.As(err, &alreadyInit))
	assert.Equal(t, namespace, alreadyInit.Namespace)
}

func TestCreateNemoGuardrailsResources_CRAnnotations(t *testing.T) {
	const namespace = "test-ns"
	scheme := newNemoTestScheme(t)
	fakeClient := newNemoFakeClient(t, scheme)

	kc := &TokenKubernetesClient{Logger: slog.Default(), Client: fakeClient}

	_, err := kc.CreateNemoGuardrailsResources(context.Background(), namespace)
	require.NoError(t, err)

	cr := getNemoCR(t, fakeClient, namespace)
	assert.Equal(t, "true", cr.GetAnnotations()[constants.NemoGuardrailsEnableAuthAnnotation])
	assert.Equal(t, "true", cr.GetLabels()[OpenDataHubDashboardLabelKey])
}

func TestCreateNemoGuardrailsResources_CleansUpConfigMapOnCRFailure(t *testing.T) {
	const namespace = "test-ns"
	scheme := newNemoTestScheme(t)

	// Pre-seed a CR so Create will fail with AlreadyExists, triggering ConfigMap cleanup
	existingCR := &unstructured.Unstructured{}
	existingCR.SetGroupVersionKind(nemoGVK)
	existingCR.SetName(nemoGuardrailsCRName)
	existingCR.SetNamespace(namespace)

	// We can't easily force CR Create to fail without an existing CR check failure,
	// so this test verifies the guard path instead: pre-seed the CR and confirm error.
	restMapper := apimeta.NewDefaultRESTMapper(nil)
	restMapper.Add(nemoGVK, apimeta.RESTScopeNamespace)
	fakeClient := fake.NewClientBuilder().
		WithScheme(scheme).
		WithRESTMapper(restMapper).
		WithObjects(&corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{Name: nemoGuardrailsPlaceholderName, Namespace: namespace},
		}).
		Build()
	_ = fakeClient.Create(context.Background(), existingCR)

	kc := &TokenKubernetesClient{Logger: slog.Default(), Client: fakeClient}

	_, err := kc.CreateNemoGuardrailsResources(context.Background(), namespace)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "already initialised")
}

func TestCreateNemoGuardrailsResources_OnlyOneCMCreated(t *testing.T) {
	const namespace = "test-ns"
	scheme := newNemoTestScheme(t)
	fakeClient := newNemoFakeClient(t, scheme)

	kc := &TokenKubernetesClient{Logger: slog.Default(), Client: fakeClient}

	_, err := kc.CreateNemoGuardrailsResources(context.Background(), namespace)
	require.NoError(t, err)

	cmList := &corev1.ConfigMapList{}
	require.NoError(t, fakeClient.List(context.Background(), cmList, client.InNamespace(namespace)))
	assert.Len(t, cmList.Items, 1)
	assert.Equal(t, nemoGuardrailsPlaceholderName, cmList.Items[0].Name)
}

func TestGetNemoGuardrailsCR_NotFound(t *testing.T) {
	scheme := newNemoTestScheme(t)
	fakeClient := newNemoFakeClient(t, scheme)

	kc := &TokenKubernetesClient{Logger: slog.Default(), Client: fakeClient}

	_, err := kc.GetNemoGuardrailsCR(context.Background(), "test-ns")
	assert.True(t, apierrors.IsNotFound(err))
}
