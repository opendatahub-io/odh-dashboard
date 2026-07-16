package repositories

import "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

// extractReadyConditionMessage returns the message from the "Ready" condition in status.conditions.
func extractReadyConditionMessage(content map[string]interface{}) string {
	conditions, _, _ := unstructured.NestedSlice(content, "status", "conditions")
	for _, c := range conditions {
		if cMap, ok := c.(map[string]interface{}); ok {
			if condType, _ := cMap["type"].(string); condType == "Ready" {
				if msg, _ := cMap["message"].(string); msg != "" {
					return msg
				}
			}
		}
	}
	return ""
}
