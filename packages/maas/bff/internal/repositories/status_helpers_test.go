package repositories

import "testing"

func TestExtractReadyCondition(t *testing.T) {
	content := map[string]interface{}{
		"status": map[string]interface{}{
			"phase": "Ready",
			"conditions": []interface{}{
				map[string]interface{}{
					"type":    "Available",
					"message": "ignored",
					"reason":  "ignored",
				},
				map[string]interface{}{
					"type":               "Ready",
					"message":            "All networking resources created successfully",
					"reason":             "Reconciled",
					"status":             "True",
					"lastTransitionTime": "2026-01-01T00:00:00Z",
				},
			},
		},
	}

	got := extractReadyCondition(content)
	if got.Message != "All networking resources created successfully" {
		t.Fatalf("extractReadyCondition().Message = %q", got.Message)
	}
	if got.Reason != "Reconciled" {
		t.Fatalf("extractReadyCondition().Reason = %q", got.Reason)
	}
	if got.Status != "True" {
		t.Fatalf("extractReadyCondition().Status = %q", got.Status)
	}
	if got.ConditionType != "Ready" {
		t.Fatalf("extractReadyCondition().ConditionType = %q", got.ConditionType)
	}
	if got.LastTransitionTime != "2026-01-01T00:00:00Z" {
		t.Fatalf("extractReadyCondition().LastTransitionTime = %q", got.LastTransitionTime)
	}
}

func TestExtractReadyConditionEmpty(t *testing.T) {
	got := extractReadyCondition(map[string]interface{}{})
	if got.Message != "" || got.Reason != "" {
		t.Fatalf("extractReadyCondition() = %+v, want empty", got)
	}
}
