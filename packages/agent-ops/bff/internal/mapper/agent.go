package mapper

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

const (
	defaultInClusterPort = 8000
	defaultProviderName  = "opendatahub"
	defaultProviderLabel = "Open Data Hub"
	defaultProviderURL   = "https://opendatahub.io"
)

// AgentSummaryToRuntime maps an agent list item to a BFF AgentRuntime.
func AgentSummaryToRuntime(item agents.AgentSummary) models.AgentRuntime {
	return models.AgentRuntime{
		Name:         item.Name,
		Namespace:    item.Namespace,
		Status:       strings.TrimSpace(item.Status),
		Type:         strings.TrimSpace(item.ResourceType),
		EndpointURL:  "",
		LastSyncTime: ParseTime(item.CreatedAt),
	}
}

// AgentDetailToRuntimeDetail maps agent detail to BFF AgentRuntimeDetail.
func AgentDetailToRuntimeDetail(detail *agents.AgentDetail) *models.AgentRuntimeDetail {
	if detail == nil {
		return &models.AgentRuntimeDetail{}
	}

	namespace := detail.Metadata.Namespace
	name := detail.Metadata.Name
	description := AgentDescription(detail.Metadata.Annotations, detail.Metadata.Labels)
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
	if synthetic := SyntheticReadyCondition(readyStatus); synthetic != nil {
		if !hasConditionType(conditions, synthetic.Type) {
			conditions = append(conditions, *synthetic)
		}
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
	}
}

// AgentCardToModel maps an agent card plus namespace to BFF AgentCard.
func AgentCardToModel(namespace string, card *agents.AgentCard) *models.AgentCard {
	if card == nil {
		return &models.AgentCard{Namespace: namespace}
	}

	skills := make([]models.AgentSkill, 0, len(card.Skills))
	for _, skill := range card.Skills {
		skills = append(skills, models.AgentSkill{
			ID:          skill.ID,
			Name:        skill.Name,
			Description: skill.Description,
		})
	}

	description := card.Description
	if description == "" {
		description = ""
	}

	return &models.AgentCard{
		Name:        card.Name,
		Namespace:   namespace,
		Description: description,
		Version:     card.Version,
		Skills:      skills,
		Capabilities: models.AgentCapabilities{
			Streaming:         card.Streaming,
			PushNotifications: false,
		},
		Provider: models.AgentProvider{
			Name:        defaultProviderName,
			DisplayName: defaultProviderLabel,
			URL:         defaultProviderURL,
		},
		SupportedInputModes:  []string{"text"},
		SupportedOutputModes: []string{"text"},
	}
}

// AgentDescription resolves a human-readable description from metadata.
func AgentDescription(annotations, labels map[string]string) string {
	if annotations != nil {
		if v := annotations[agents.AnnotationDescription]; v != "" {
			return v
		}
		if v := annotations[agents.AnnotationDescriptionAlt]; v != "" {
			return v
		}
	}
	_ = labels
	return ""
}

// BuildPrimaryEndpointURL constructs the primary in-cluster HTTP URL for an agent Service.
func BuildPrimaryEndpointURL(serviceName, namespace string, ports []agents.AgentServicePort) string {
	port := SelectHTTPPort(ports)
	return fmt.Sprintf("http://%s.%s.svc.cluster.local:%d", serviceName, namespace, port)
}

// SelectHTTPPort picks the Service port used for the primary endpoint (prefers named port "http").
func SelectHTTPPort(ports []agents.AgentServicePort) int {
	for _, p := range ports {
		if p.Name == "http" && p.Port > 0 {
			return p.Port
		}
	}
	if len(ports) > 0 && ports[0].Port > 0 {
		return ports[0].Port
	}
	return defaultInClusterPort
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
			URL:  fmt.Sprintf("http://%s.%s.svc.cluster.local:%d", service.Name, namespace, port.Port),
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
func SyntheticReadyCondition(readyStatus string) *models.AgentRuntimeCondition {
	if strings.TrimSpace(readyStatus) != "Ready" {
		return nil
	}
	return &models.AgentRuntimeCondition{
		Type:               "Ready",
		Status:             "True",
		Reason:             "MinimumReplicasAvailable",
		Message:            "Deployment has minimum availability.",
		LastTransitionTime: time.Now().UTC(),
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
