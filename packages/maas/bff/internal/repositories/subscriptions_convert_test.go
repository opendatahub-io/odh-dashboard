package repositories

import (
	"encoding/json"
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

func TestConvertSubscriptionListItemsToMySubscriptionsStripsAdminMetadata(t *testing.T) {
	priority := int32(1)
	items := ConvertSubscriptionListItemsToMySubscriptions([]models.SubscriptionListItem{{
		SubscriptionIDHeader:    "simulator-maas-demo-subscription",
		SubscriptionDescription: "Subscription for simulator MaaS demo model",
		DisplayName:             "simulator-maas-demo-subscription",
		Priority:                &priority,
		OrganizationID:          "grid-tenant-1",
		Roles:                   []string{"admin"},
		Owner:                   &models.OwnerSpec{Groups: []models.GroupReference{{Name: "org/ai-grid-users"}}},
		ModelRefs: []models.ModelRefInfo{{
			Name:     "simulator-maas-demo",
			Subjects: &models.SubjectSpec{Groups: []models.GroupReference{{Name: "org/ai-grid-users"}}},
		}},
	}})

	if len(items) != 1 || items[0].Priority == nil || *items[0].Priority != 1 {
		t.Fatalf("unexpected converted subscriptions: %+v", items)
	}
	encoded, err := json.Marshal(items[0])
	if err != nil {
		t.Fatalf("marshal converted subscription: %v", err)
	}
	for _, forbidden := range []string{"roles", "subjects"} {
		if string(encoded) != "" && jsonContainsKey(encoded, forbidden) {
			t.Fatalf("converted subscription contains forbidden field %q: %s", forbidden, encoded)
		}
		if len(items[0].Owner.Groups) != 1 || items[0].Owner.Groups[0].Name != "org/ai-grid-users" {
			t.Fatalf("owner groups were not preserved: %+v", items[0].Owner)
		}
	}
}

func TestFilterSubscriptionsForMyViewExcludesOwnerSubscriptions(t *testing.T) {
	items := []models.SubscriptionListItem{
		{SubscriptionIDHeader: "owned-sub", Owner: &models.OwnerSpec{}},
		{SubscriptionIDHeader: "my-sub", Roles: []string{"admin"}},
	}

	filtered := FilterSubscriptionsForMyView(items)
	if len(filtered) != 1 || filtered[0].SubscriptionIDHeader != "my-sub" {
		t.Fatalf("filtered subscriptions = %+v, want only my-sub", filtered)
	}
}

func TestFilterSubscriptionsForMyViewExcludesOwnerSubscriptionsForNonAdmins(t *testing.T) {
	items := []models.SubscriptionListItem{
		{SubscriptionIDHeader: "owned-sub", Owner: &models.OwnerSpec{}},
		{SubscriptionIDHeader: "my-sub"},
	}

	filtered := FilterSubscriptionsForMyView(items)
	if len(filtered) != 1 || filtered[0].SubscriptionIDHeader != "my-sub" {
		t.Fatalf("filtered subscriptions = %+v, want only my-sub", filtered)
	}
}

func jsonContainsKey(data []byte, key string) bool {
	var value map[string]any
	if err := json.Unmarshal(data, &value); err != nil {
		return false
	}
	_, exists := value[key]
	return exists
}

func TestConvertUnstructuredToSubscription_FlowControlStatusesAndObjectivesReady(t *testing.T) {
	obj := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "maas.opendatahub.io/v1alpha1",
			"kind":       "MaaSSubscription",
			"metadata": map[string]interface{}{
				"name":            "premium-team-sub",
				"namespace":       "maas-system",
				"resourceVersion": "98765",
			},
			"spec": map[string]interface{}{
				"inferencePriority": int64(10),
				"owner": map[string]interface{}{
					"groups": []interface{}{
						map[string]interface{}{"name": "premium-users"},
					},
				},
				"modelRefs": []interface{}{
					map[string]interface{}{
						"name":      "maas-model-user",
						"namespace": "user-project",
						"tokenRateLimits": []interface{}{
							map[string]interface{}{"limit": int64(1000), "window": "1h"},
						},
					},
					map[string]interface{}{
						"name":      "flan-t5-small",
						"namespace": "maas-models",
						"tokenRateLimits": []interface{}{
							map[string]interface{}{"limit": int64(500), "window": "1m"},
						},
					},
				},
			},
			"status": map[string]interface{}{
				"phase": "Active",
				"conditions": []interface{}{
					map[string]interface{}{
						"type":               "Ready",
						"status":             "True",
						"reason":             "Reconciled",
						"message":            "successfully reconciled",
						"lastTransitionTime": "2026-01-01T00:00:00Z",
					},
					map[string]interface{}{
						"type":               "InferenceObjectivesReady",
						"status":             "True",
						"reason":             "Reconciled",
						"message":            "Inference objectives are ready",
						"lastTransitionTime": "2026-01-01T00:01:00Z",
					},
				},
				"flowControlStatuses": []interface{}{
					map[string]interface{}{
						"name":      "maas-model-user",
						"namespace": "user-project",
						"inferencePool": map[string]interface{}{
							"group": "inference.networking.k8s.io",
							"kind":  "InferencePool",
							"name":  "maas-model-user-inference-pool",
						},
						"objectiveName": "maas-models-as-a-service-gold-maas-model-user-inference-pool-a1b2c3d4e5",
						"ready":         true,
						"reason":        "ObjectiveReconciled",
						"message":       "InferenceObjective sets priority 10",
					},
					map[string]interface{}{
						"name":      "flan-t5-small",
						"namespace": "maas-models",
						"ready":     false,
						"reason":    "PendingPoolDiscovery",
						"message":   "Waiting for InferencePool discovery",
					},
				},
			},
		},
	}

	sub, err := convertUnstructuredToSubscription(obj)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if sub.ResourceVersion != "98765" {
		t.Fatalf("ResourceVersion = %q, want 98765", sub.ResourceVersion)
	}
	if sub.InferencePriority == nil || *sub.InferencePriority != 10 {
		t.Fatalf("InferencePriority = %v, want 10", sub.InferencePriority)
	}
	if sub.InferenceObjectivesReady == nil {
		t.Fatal("InferenceObjectivesReady is nil, want condition")
	}
	if sub.InferenceObjectivesReady.Type != "InferenceObjectivesReady" {
		t.Errorf("InferenceObjectivesReady.Type = %q", sub.InferenceObjectivesReady.Type)
	}
	if sub.InferenceObjectivesReady.Status != "True" {
		t.Errorf("InferenceObjectivesReady.Status = %q", sub.InferenceObjectivesReady.Status)
	}
	if sub.InferenceObjectivesReady.Reason != "Reconciled" {
		t.Errorf("InferenceObjectivesReady.Reason = %q", sub.InferenceObjectivesReady.Reason)
	}
	if len(sub.ModelRefs) != 2 {
		t.Fatalf("ModelRefs len = %d, want 2", len(sub.ModelRefs))
	}
	if sub.ModelRefs[0].ObjectiveName != "maas-models-as-a-service-gold-maas-model-user-inference-pool-a1b2c3d4e5" {
		t.Errorf("ModelRefs[0].ObjectiveName = %q", sub.ModelRefs[0].ObjectiveName)
	}
	if sub.ModelRefs[0].TargetPool != "maas-model-user-inference-pool" {
		t.Errorf("ModelRefs[0].TargetPool = %q, want inferencePool.name", sub.ModelRefs[0].TargetPool)
	}
	if sub.ModelRefs[0].Ready == nil || !*sub.ModelRefs[0].Ready {
		t.Errorf("ModelRefs[0].Ready = %v, want true", sub.ModelRefs[0].Ready)
	}
	if sub.ModelRefs[0].Reason != "ObjectiveReconciled" {
		t.Errorf("ModelRefs[0].Reason = %q", sub.ModelRefs[0].Reason)
	}
	if sub.ModelRefs[0].Message != "InferenceObjective sets priority 10" {
		t.Errorf("ModelRefs[0].Message = %q", sub.ModelRefs[0].Message)
	}
	if sub.ModelRefs[1].Ready == nil || *sub.ModelRefs[1].Ready {
		t.Errorf("ModelRefs[1].Ready = %v, want false", sub.ModelRefs[1].Ready)
	}
	if sub.ModelRefs[1].TargetPool != "" {
		t.Errorf("ModelRefs[1].TargetPool = %q, want empty when inferencePool absent", sub.ModelRefs[1].TargetPool)
	}
}

func TestConvertUnstructuredToSubscription_OmitsUnsetInferencePriorityAndObjectivesReady(t *testing.T) {
	obj := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "maas.opendatahub.io/v1alpha1",
			"kind":       "MaaSSubscription",
			"metadata": map[string]interface{}{
				"name":      "basic-team-sub",
				"namespace": "maas-system",
			},
			"spec": map[string]interface{}{
				"owner": map[string]interface{}{
					"groups": []interface{}{},
				},
				"modelRefs": []interface{}{
					map[string]interface{}{
						"name":      "flan-t5-small",
						"namespace": "maas-models",
					},
				},
			},
			"status": map[string]interface{}{
				"conditions": []interface{}{
					map[string]interface{}{
						"type":    "Ready",
						"status":  "True",
						"reason":  "Reconciled",
						"message": "successfully reconciled",
					},
				},
			},
		},
	}

	sub, err := convertUnstructuredToSubscription(obj)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if sub.InferencePriority != nil {
		t.Fatalf("InferencePriority = %v, want nil when unset", *sub.InferencePriority)
	}
	if sub.InferenceObjectivesReady != nil {
		t.Fatalf("InferenceObjectivesReady = %+v, want nil when condition absent", sub.InferenceObjectivesReady)
	}
}

func TestBuildAndUpdateSubscriptionSpec_InferencePriorityOptional(t *testing.T) {
	priority := int32(-5)
	obj := buildSubscriptionUnstructured(
		"test-sub",
		"maas-system",
		"Test",
		"",
		models.OwnerSpec{Groups: []models.GroupReference{{Name: "users"}}},
		[]models.ModelSubscriptionRef{{Name: "m", Namespace: "ns", TokenRateLimits: []models.TokenRateLimit{{Limit: 1, Window: "1h"}}}},
		nil,
		&priority,
	)
	spec, _, _ := unstructured.NestedMap(obj.Object, "spec")
	if spec["inferencePriority"] != int64(-5) {
		t.Fatalf("create spec.inferencePriority = %v, want -5", spec["inferencePriority"])
	}
	if _, ok := spec["inference_priority"]; ok {
		t.Fatal("create must not write legacy inference_priority key")
	}

	updateSubscriptionSpec(obj, "Test", "", models.OwnerSpec{Groups: []models.GroupReference{{Name: "users"}}},
		[]models.ModelSubscriptionRef{{Name: "m", Namespace: "ns", TokenRateLimits: []models.TokenRateLimit{{Limit: 1, Window: "1h"}}}},
		nil,
		nil,
	)
	spec, _, _ = unstructured.NestedMap(obj.Object, "spec")
	if _, ok := spec["inferencePriority"]; ok {
		t.Fatal("update with nil InferencePriority must clear inferencePriority from spec")
	}
}
