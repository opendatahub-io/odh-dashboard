package repositories

import (
	"context"
	"log/slog"
	"testing"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// newModelRefObj builds a minimal MaaSModelRef unstructured object for tests.
func newModelRefObj(name, namespace, displayName, description, phase, endpoint string) *unstructured.Unstructured {
	annotations := map[string]interface{}{}
	if displayName != "" {
		annotations[constants.DisplayNameAnnotation] = displayName
	}
	if description != "" {
		annotations[constants.DescriptionAnnotation] = description
	}
	return &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "maas.opendatahub.io/v1alpha1",
			"kind":       "MaaSModelRef",
			"metadata": map[string]interface{}{
				"name":        name,
				"namespace":   namespace,
				"annotations": annotations,
			},
			"spec": map[string]interface{}{
				"modelRef": map[string]interface{}{
					"kind": "LLMInferenceService",
					"name": name,
				},
			},
			"status": map[string]interface{}{
				"phase":    phase,
				"endpoint": endpoint,
				"conditions": []interface{}{
					map[string]interface{}{
						"type":    "Ready",
						"message": "Model endpoint is ready",
					},
				},
			},
		},
	}
}

// --- buildModelRefSummaryIndex ---

func TestBuildModelRefSummaryIndex_Basic(t *testing.T) {
	summaries := []models.MaaSModelRefSummary{
		{Name: "model-a", Namespace: "ns1", DisplayName: "Model A"},
		{Name: "model-b", Namespace: "ns1", DisplayName: "Model B"},
		{Name: "model-a", Namespace: "ns2", DisplayName: "Model A ns2"},
	}

	idx := buildModelRefSummaryIndex(summaries)

	if len(idx) != 3 {
		t.Fatalf("expected 3 entries, got %d", len(idx))
	}
	if got := idx["ns1/model-a"].DisplayName; got != "Model A" {
		t.Errorf("ns1/model-a DisplayName: expected %q, got %q", "Model A", got)
	}
	if got := idx["ns1/model-b"].DisplayName; got != "Model B" {
		t.Errorf("ns1/model-b DisplayName: expected %q, got %q", "Model B", got)
	}
	if got := idx["ns2/model-a"].DisplayName; got != "Model A ns2" {
		t.Errorf("ns2/model-a DisplayName: expected %q, got %q", "Model A ns2", got)
	}
}

func TestBuildModelRefSummaryIndex_Empty(t *testing.T) {
	idx := buildModelRefSummaryIndex(nil)
	if len(idx) != 0 {
		t.Errorf("expected empty index, got %d entries", len(idx))
	}
}

func TestBuildModelRefSummaryIndex_LastWriteWins(t *testing.T) {
	// When two summaries share the same namespace/name key the last one wins.
	summaries := []models.MaaSModelRefSummary{
		{Name: "m", Namespace: "ns", DisplayName: "first"},
		{Name: "m", Namespace: "ns", DisplayName: "second"},
	}
	idx := buildModelRefSummaryIndex(summaries)
	if got := idx["ns/m"].DisplayName; got != "second" {
		t.Errorf("expected %q, got %q", "second", got)
	}
}

// --- convertUnstructuredToModelRefSummary ---

func TestConvertUnstructuredToModelRefSummary_Full(t *testing.T) {
	obj := newModelRefObj("my-model", "my-ns", "My Model", "A test model", "Ready", "http://ep:8080")

	summary := convertUnstructuredToModelRefSummary(obj)

	type check struct{ want, got string }
	for field, c := range map[string]check{
		"Name":          {"my-model", summary.Name},
		"Namespace":     {"my-ns", summary.Namespace},
		"DisplayName":   {"My Model", summary.DisplayName},
		"Description":   {"A test model", summary.Description},
		"Phase":         {"Ready", summary.Phase},
		"Endpoint":      {"http://ep:8080", summary.Endpoint},
		"StatusMessage": {"Model endpoint is ready", summary.StatusMessage},
		"ModelRef.Kind": {"LLMInferenceService", summary.ModelRef.Kind},
		"ModelRef.Name": {"my-model", summary.ModelRef.Name},
	} {
		if c.want != c.got {
			t.Errorf("%s: expected %q, got %q", field, c.want, c.got)
		}
	}
}

func TestConvertUnstructuredToModelRefSummary_WithModelCapabilities(t *testing.T) {
	obj := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "maas.opendatahub.io/v1alpha1",
			"kind":       "MaaSModelRef",
			"metadata": map[string]interface{}{
				"name":      "capable-model",
				"namespace": "test-ns",
				"annotations": map[string]interface{}{
					"opendatahub.io/model-capabilities": `["text-generation","vision"]`,
				},
			},
		},
	}

	summary := convertUnstructuredToModelRefSummary(obj)

	if len(summary.ModelCapabilities) != 2 {
		t.Fatalf("expected 2 capabilities, got %d", len(summary.ModelCapabilities))
	}
	if summary.ModelCapabilities[0] != "text-generation" {
		t.Errorf("ModelCapabilities[0]: expected %q, got %q", "text-generation", summary.ModelCapabilities[0])
	}
	if summary.ModelCapabilities[1] != "vision" {
		t.Errorf("ModelCapabilities[1]: expected %q, got %q", "vision", summary.ModelCapabilities[1])
	}
}

func TestConvertUnstructuredToModelRefSummary_MalformedCapabilities(t *testing.T) {
	obj := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "maas.opendatahub.io/v1alpha1",
			"kind":       "MaaSModelRef",
			"metadata": map[string]interface{}{
				"name":      "bad-caps-model",
				"namespace": "test-ns",
				"annotations": map[string]interface{}{
					"opendatahub.io/model-capabilities": "not-valid-json",
				},
			},
		},
	}

	summary := convertUnstructuredToModelRefSummary(obj)

	if summary.ModelCapabilities != nil {
		t.Errorf("expected nil ModelCapabilities for malformed annotation, got %v", summary.ModelCapabilities)
	}
}

func TestConvertUnstructuredToModelRefSummary_NoAnnotations(t *testing.T) {
	obj := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "maas.opendatahub.io/v1alpha1",
			"kind":       "MaaSModelRef",
			"metadata": map[string]interface{}{
				"name":      "bare-model",
				"namespace": "default",
			},
		},
	}

	summary := convertUnstructuredToModelRefSummary(obj)
	if summary.DisplayName != "" {
		t.Errorf("expected empty DisplayName, got %q", summary.DisplayName)
	}
	if summary.Description != "" {
		t.Errorf("expected empty Description, got %q", summary.Description)
	}
}

// --- listAllModelRefSummaries ---

// newFakeDynamicClient creates a dynamicfake client that supports listing MaaSModelRef resources,
// and pre-seeds it with the given objects via Create calls.
func newFakeDynamicClient(t *testing.T, objs ...*unstructured.Unstructured) *dynamicfake.FakeDynamicClient {
	t.Helper()
	scheme := runtime.NewScheme()
	client := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(scheme, map[schema.GroupVersionResource]string{
		constants.MaaSModelRefGvr: "MaaSModelRefList",
	})
	ctx := context.Background()
	for _, obj := range objs {
		_, err := client.Resource(constants.MaaSModelRefGvr).
			Namespace(obj.GetNamespace()).
			Create(ctx, obj, metav1.CreateOptions{})
		if err != nil {
			t.Fatalf("test setup: failed to seed object %q: %v", obj.GetName(), err)
		}
	}
	return client
}

func TestListAllModelRefSummaries_ReturnsSummaries(t *testing.T) {
	obj1 := newModelRefObj("model-one", "test-ns", "Model One", "First", "Ready", "http://ep1")
	obj2 := newModelRefObj("model-two", "test-ns", "Model Two", "Second", "NotReady", "")
	fakeClient := newFakeDynamicClient(t, obj1, obj2)

	summaries, err := listAllModelRefSummaries(context.Background(), slog.Default(), fakeClient)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(summaries) != 2 {
		t.Errorf("expected 2 summaries, got %d", len(summaries))
	}

	byKey := buildModelRefSummaryIndex(summaries)
	if got := byKey["test-ns/model-one"].DisplayName; got != "Model One" {
		t.Errorf("model-one DisplayName: expected %q, got %q", "Model One", got)
	}
	if got := byKey["test-ns/model-two"].Phase; got != "NotReady" {
		t.Errorf("model-two Phase: expected %q, got %q", "NotReady", got)
	}
}

func TestListAllModelRefSummaries_Empty(t *testing.T) {
	fakeClient := newFakeDynamicClient(t)

	summaries, err := listAllModelRefSummaries(context.Background(), slog.Default(), fakeClient)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(summaries) != 0 {
		t.Errorf("expected 0 summaries, got %d", len(summaries))
	}
}

// --- Enrichment round-trip ---

// TestEnrichmentRoundTrip verifies that building an index and decorating refs produces
// correct DisplayName/Description on matched entries and leaves unmatched entries empty.
func TestEnrichmentRoundTrip(t *testing.T) {
	summaries := []models.MaaSModelRefSummary{
		{Name: "premium-model", Namespace: "ns1", DisplayName: "Premium Model", Description: "A premium model"},
	}
	idx := buildModelRefSummaryIndex(summaries)

	refs := []models.ModelSubscriptionRef{
		{Name: "premium-model", Namespace: "ns1"},
		{Name: "unknown-model", Namespace: "ns1"},
	}

	for i := range refs {
		if s, ok := idx[refs[i].Namespace+"/"+refs[i].Name]; ok {
			refs[i].DisplayName = s.DisplayName
			refs[i].Description = s.Description
		}
	}

	if refs[0].DisplayName != "Premium Model" {
		t.Errorf("refs[0].DisplayName: expected %q, got %q", "Premium Model", refs[0].DisplayName)
	}
	if refs[0].Description != "A premium model" {
		t.Errorf("refs[0].Description: expected %q, got %q", "A premium model", refs[0].Description)
	}
	if refs[1].DisplayName != "" {
		t.Errorf("refs[1].DisplayName: expected empty, got %q", refs[1].DisplayName)
	}
}
