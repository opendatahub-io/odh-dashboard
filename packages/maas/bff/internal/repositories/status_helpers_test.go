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
					"type":    "Ready",
					"message": "All networking resources created successfully",
					"reason":  "Reconciled",
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
}

func TestExtractReadyConditionEmpty(t *testing.T) {
	got := extractReadyCondition(map[string]interface{}{})
	if got.Message != "" || got.Reason != "" {
		t.Fatalf("extractReadyCondition() = %+v, want empty", got)
	}
}
