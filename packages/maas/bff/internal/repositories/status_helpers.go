package repositories

import "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

// readyConditionFields holds message and reason from the Ready condition.
type readyConditionFields struct {
	Message string
	Reason  string
}

// extractReadyCondition returns the message and reason from the "Ready" condition in status.conditions.
func extractReadyCondition(content map[string]interface{}) readyConditionFields {
	conditions, _, _ := unstructured.NestedSlice(content, "status", "conditions")
	for _, c := range conditions {
		cMap, ok := c.(map[string]interface{})
		if !ok {
			continue
		}
		if condType, _ := cMap["type"].(string); condType != "Ready" {
			continue
		}
		message, _ := cMap["message"].(string)
		reason, _ := cMap["reason"].(string)
		return readyConditionFields{Message: message, Reason: reason}
	}
	return readyConditionFields{}
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
