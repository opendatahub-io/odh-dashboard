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

// isConditionStatusTrue reports whether status.conditions contains type==conditionType with status=="True".
func isConditionStatusTrue(content map[string]interface{}, conditionType string) bool {
	conditions, _, _ := unstructured.NestedSlice(content, "status", "conditions")
	for _, c := range conditions {
		cMap, ok := c.(map[string]interface{})
		if !ok {
			continue
		}
		if condType, _ := cMap["type"].(string); condType != conditionType {
			continue
		}
		status, _ := cMap["status"].(string)
		return status == "True"
	}
	return false
}
