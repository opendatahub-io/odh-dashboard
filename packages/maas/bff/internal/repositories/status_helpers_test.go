package repositories

import "testing"

func TestExtractReadyConditionMessage(t *testing.T) {
	content := map[string]interface{}{
		"status": map[string]interface{}{
			"phase": "Ready",
			"conditions": []interface{}{
				map[string]interface{}{
					"type":    "Available",
					"message": "ignored",
				},
				map[string]interface{}{
					"type":    "Ready",
					"message": "All networking resources created successfully",
				},
			},
		},
	}

	if got := extractReadyConditionMessage(content); got != "All networking resources created successfully" {
		t.Fatalf("extractReadyConditionMessage() = %q", got)
	}
}
