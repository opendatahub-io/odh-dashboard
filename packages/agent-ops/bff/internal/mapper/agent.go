package mapper

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

// AgentSummaryToRuntime maps an agent list item to a BFF AgentRuntime.
func AgentSummaryToRuntime(item agents.AgentSummary) models.AgentRuntime {
	lastSync := ParseTime(item.LastSyncAt)
	if lastSync.IsZero() {
		lastSync = ParseTime(item.CreatedAt)
	}

	return models.AgentRuntime{
		Name:         item.Name,
		Namespace:    item.Namespace,
		Status:       strings.TrimSpace(item.Status),
		Type:         strings.TrimSpace(item.ResourceType),
		EndpointURL:  strings.TrimSpace(item.EndpointURL),
		LastSyncTime: lastSync,
	}
}

// AgentDetailToRuntimeDetail maps agent detail to BFF AgentRuntimeDetail.
func AgentDetailToRuntimeDetail(detail *agents.AgentDetail) *models.AgentRuntimeDetail {
	if detail == nil {
		return &models.AgentRuntimeDetail{}
	}

	namespace := detail.Metadata.Namespace
	name := detail.Metadata.Name
	description := AgentDescription(detail.Metadata.Annotations)
	resourceType := strings.TrimSpace(detail.Metadata.Labels[agents.LabelAgentType])
	readyStatus := strings.TrimSpace(detail.ReadyStatus)

	endpointURL := ""
	serviceEndpoints := []models.AgentServiceEndpoint{}
	if detail.Service != nil {
		endpointURL = BuildPrimaryEndpointURL(detail.Service.Name, namespace, detail.Service.Ports)
		serviceEndpoints = MapServiceEndpoints(detail.Service, namespace)
	}

	lastSync := ParseTime(detail.Metadata.CreationTimestamp)
	if t := LatestConditionTime(detail.Status); !t.IsZero() {
		lastSync = t
	}

	conditions := MapWorkloadConditions(detail.Status)
	if synthetic := SyntheticReadyCondition(readyStatus, lastSync); synthetic != nil {
		if !hasConditionType(conditions, synthetic.Type) {
			conditions = append(conditions, *synthetic)
		}
	}

	var agentCard *models.AgentCardDetail
	if card := MapAgentCardDetail(detail, serviceEndpoints); card != nil {
		if strings.TrimSpace(card.Description) != "" {
			description = card.Description
		}
		agentCard = card
	}

	return &models.AgentRuntimeDetail{
		Name:        name,
		Namespace:   namespace,
		Description: description,
		Runtime: models.AgentRuntime{
			Name:         name,
			Namespace:    namespace,
			Status:       readyStatus,
			Type:         resourceType,
			EndpointURL:  endpointURL,
			LastSyncTime: lastSync,
		},
		WorkloadStatus:   readyStatus,
		ServiceEndpoints: serviceEndpoints,
		PodCount:         ReadyReplicaCount(detail.Status),
		Conditions:       conditions,
		AgentCard:        agentCard,
	}
}

// AgentDescription resolves a human-readable description from metadata annotations.
func AgentDescription(annotations map[string]string) string {
	if annotations != nil {
		if v := annotations[agents.AnnotationDescription]; v != "" {
			return v
		}
		if v := annotations["description"]; v != "" {
			return v
		}
	}
	return ""
}

// BuildPrimaryEndpointURL constructs the primary in-cluster URL for an agent Service.
func BuildPrimaryEndpointURL(serviceName, namespace string, ports []agents.AgentServicePort) string {
	port, ok := SelectPrimaryPort(ports)
	if !ok {
		return ""
	}
	return buildInClusterServiceURL(serviceName, namespace, port)
}

// SelectPrimaryPort picks the Service port used for the primary endpoint (prefers "http", then "https").
func SelectPrimaryPort(ports []agents.AgentServicePort) (agents.AgentServicePort, bool) {
	for _, p := range ports {
		if p.Name == "http" && p.Port > 0 {
			return p, true
		}
	}
	for _, p := range ports {
		if p.Name == "https" && p.Port > 0 {
			return p, true
		}
	}
	if len(ports) > 0 && ports[0].Port > 0 {
		return ports[0], true
	}
	return agents.AgentServicePort{}, false
}

// SelectHTTPPort returns the port number selected by SelectPrimaryPort, or 0 when none is usable.
func SelectHTTPPort(ports []agents.AgentServicePort) int {
	port, ok := SelectPrimaryPort(ports)
	if !ok {
		return 0
	}
	return port.Port
}

func endpointScheme(port agents.AgentServicePort) string {
	if strings.EqualFold(port.Name, "https") || port.Port == 443 {
		return "https"
	}
	return "http"
}

func buildInClusterServiceURL(serviceName, namespace string, port agents.AgentServicePort) string {
	scheme := endpointScheme(port)
	return fmt.Sprintf("%s://%s.%s.svc.cluster.local:%d", scheme, serviceName, namespace, port.Port)
}

// MapServiceEndpoints maps Service ports to BFF endpoint records.
func MapServiceEndpoints(service *agents.AgentService, namespace string) []models.AgentServiceEndpoint {
	if service == nil {
		return nil
	}
	endpoints := make([]models.AgentServiceEndpoint, 0, len(service.Ports))
	for _, port := range service.Ports {
		if port.Port <= 0 {
			continue
		}
		endpoints = append(endpoints, models.AgentServiceEndpoint{
			Name: port.Name,
			Port: port.Port,
			URL:  buildInClusterServiceURL(service.Name, namespace, port),
		})
	}
	return endpoints
}

// MapWorkloadConditions maps Kubernetes status.conditions to BFF conditions.
func MapWorkloadConditions(status map[string]any) []models.AgentRuntimeCondition {
	raw, ok := status["conditions"]
	if !ok {
		return nil
	}
	items, ok := raw.([]any)
	if !ok {
		return nil
	}

	conditions := make([]models.AgentRuntimeCondition, 0, len(items))
	for _, item := range items {
		cond, ok := item.(map[string]any)
		if !ok {
			continue
		}
		conditions = append(conditions, models.AgentRuntimeCondition{
			Type:    stringValue(cond["type"]),
			Status:  stringValue(cond["status"]),
			Reason:  stringValue(cond["reason"]),
			Message: stringValue(cond["message"]),
			LastTransitionTime: ParseTime(
				stringValue(cond["lastTransitionTime"]),
				stringValue(cond["last_transition_time"]),
			),
		})
	}
	return conditions
}

// ReadyReplicaCount reads ready replica count from workload status.
func ReadyReplicaCount(status map[string]any) int {
	if status == nil {
		return 0
	}
	if v, ok := intFromAny(status["readyReplicas"]); ok {
		return v
	}
	if v, ok := intFromAny(status["ready_replicas"]); ok {
		return v
	}
	return 0
}

// LatestConditionTime returns the latest condition transition time from workload status.
func LatestConditionTime(status map[string]any) time.Time {
	conditions := MapWorkloadConditions(status)
	var latest time.Time
	for _, cond := range conditions {
		if cond.LastTransitionTime.After(latest) {
			latest = cond.LastTransitionTime
		}
	}
	return latest
}

// SyntheticReadyCondition adds a Ready condition when upstream reports Ready but K8s conditions omit it.
func SyntheticReadyCondition(readyStatus string, lastTransitionTime time.Time) *models.AgentRuntimeCondition {
	if strings.TrimSpace(readyStatus) != "Ready" {
		return nil
	}
	return &models.AgentRuntimeCondition{
		Type:               "Ready",
		Status:             "True",
		Reason:             "MinimumReplicasAvailable",
		Message:            "Deployment has minimum availability.",
		LastTransitionTime: lastTransitionTime,
	}
}

// ParseTime parses an ISO8601 timestamp, returning zero time on failure.
func ParseTime(values ...string) time.Time {
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if t, err := time.Parse(time.RFC3339Nano, value); err == nil {
			return t
		}
		if t, err := time.Parse(time.RFC3339, value); err == nil {
			return t
		}
	}
	return time.Time{}
}

func hasConditionType(conditions []models.AgentRuntimeCondition, conditionType string) bool {
	for _, cond := range conditions {
		if cond.Type == conditionType {
			return true
		}
	}
	return false
}

func stringValue(values ...any) string {
	for _, value := range values {
		switch v := value.(type) {
		case string:
			if v != "" {
				return v
			}
		case fmt.Stringer:
			return v.String()
		}
	}
	return ""
}

// intFromAny coerces numeric values to int. float64 inputs are truncated toward zero (e.g. 2.9 -> 2).
func intFromAny(value any) (int, bool) {
	switch v := value.(type) {
	case int:
		return v, true
	case int32:
		return int(v), true
	case int64:
		return int(v), true
	case float64:
		return int(v), true
	case string:
		i, err := strconv.Atoi(v)
		if err != nil {
			return 0, false
		}
		return i, true
	default:
		return 0, false
	}
}
