package mapper

import (
	"fmt"
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

	serviceName := serviceNameFromSummary(item)
	ports := MapServiceEndpointsFromPorts(item.Ports, item.Namespace, serviceName)
	if ports == nil {
		ports = []models.AgentServiceEndpoint{}
	}

	return models.AgentRuntime{
		Name:         item.Name,
		Namespace:    item.Namespace,
		DisplayName:  item.DisplayName,
		Description:  item.Description,
		Framework:    item.Framework,
		Status:        strings.TrimSpace(item.Status),
		StatusMessage: strings.TrimSpace(item.StatusMessage),
		Type:          strings.TrimSpace(item.ResourceType),
		ServiceFQDN:  strings.TrimSpace(item.ServiceFQDN),
		PodIP:        strings.TrimSpace(item.PodIP),
		Ports:        ports,
		EndpointURL:  strings.TrimSpace(item.EndpointURL),
		WorkloadType: strings.TrimSpace(item.WorkloadType),
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
	displayName := AgentDisplayName(detail.Metadata.Annotations, name)
	framework := AgentFramework(detail.Metadata.Annotations)
	resourceType := agents.ResolveAgentResourceType(detail.Metadata.Labels)
	readyStatus := strings.TrimSpace(detail.ReadyStatus)
	serviceFQDN := strings.TrimSpace(detail.ServiceFQDN)
	if serviceFQDN == "" {
		serviceFQDN = serviceFQDNFromStatus(detail.Status)
	}

	endpointURL := ""
	serviceEndpoints := []models.AgentServiceEndpoint{}
	if detail.Service != nil {
		endpointURL = BuildPrimaryEndpointURL(detail.Service.Name, namespace, detail.Service.Ports)
		serviceEndpoints = MapServiceEndpoints(detail.Service, namespace)
	}
	if serviceEndpoints == nil {
		serviceEndpoints = []models.AgentServiceEndpoint{}
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

	containerImage := strings.TrimSpace(detail.ContainerImage)
	if containerImage == "" {
		containerImage = ContainerImageFromSpec(detail.Spec)
	}

	return &models.AgentRuntimeDetail{
		Name:           name,
		Namespace:      namespace,
		DisplayName:    displayName,
		Description:    description,
		Framework:      framework,
		ServiceFQDN:    serviceFQDN,
		ContainerImage: containerImage,
		Labels:         copyStringMap(detail.Metadata.Labels),
		Annotations:    copyStringMap(detail.Metadata.Annotations),
		Runtime: models.AgentRuntime{
			Name:         name,
			Namespace:    namespace,
			DisplayName:  displayName,
			Description:  description,
			Framework:    framework,
			Status:       readyStatus,
			Type:         resourceType,
			ServiceFQDN:  serviceFQDN,
			Ports:        serviceEndpoints,
			EndpointURL:  endpointURL,
			WorkloadType: strings.TrimSpace(detail.WorkloadType),
			LastSyncTime: lastSync,
		},
		WorkloadStatus:   readyStatus,
		ServiceEndpoints: serviceEndpoints,
		Conditions:       conditions,
	}
}

// AgentDisplayName resolves a human-readable display name from metadata annotations.
func AgentDisplayName(annotations map[string]string, resourceName string) string {
	if annotations != nil {
		if v := strings.TrimSpace(annotations[agents.AnnotationDisplayName]); v != "" {
			return v
		}
	}
	return strings.TrimSpace(resourceName)
}

// AgentDescription resolves a human-readable description from metadata annotations.
func AgentDescription(annotations map[string]string) string {
	if annotations != nil {
		if v := strings.TrimSpace(annotations[agents.AnnotationDescription]); v != "" {
			return v
		}
	}
	return ""
}

// AgentFramework resolves the agent framework from metadata annotations.
func AgentFramework(annotations map[string]string) string {
	if annotations != nil {
		if v := strings.TrimSpace(annotations[agents.AnnotationFramework]); v != "" {
			return v
		}
	}
	return ""
}

// ContainerImageFromSpec returns the primary container image from a Sandbox spec.
func ContainerImageFromSpec(spec map[string]any) string {
	if spec == nil {
		return ""
	}
	for _, templateKey := range []string{"podTemplate", "template"} {
		template, ok := spec[templateKey].(map[string]any)
		if !ok {
			continue
		}
		podSpec, ok := template["spec"].(map[string]any)
		if !ok {
			continue
		}
		containers, ok := podSpec["containers"].([]any)
		if !ok || len(containers) == 0 {
			continue
		}
		container, ok := containers[0].(map[string]any)
		if !ok {
			continue
		}
		if image := strings.TrimSpace(stringValue(container["image"])); image != "" {
			return image
		}
	}
	return ""
}

// MapServiceEndpointsFromPorts maps integration ports to BFF endpoint records.
func MapServiceEndpointsFromPorts(ports []agents.AgentServicePort, namespace, serviceName string) []models.AgentServiceEndpoint {
	if serviceName == "" {
		return nil
	}
	if len(ports) == 0 {
		return nil
	}
	return MapServiceEndpoints(&agents.AgentService{Name: serviceName, Ports: ports}, namespace)
}

func serviceFQDNFromStatus(status map[string]any) string {
	if status == nil {
		return ""
	}
	return strings.TrimSpace(stringValue(status["serviceFQDN"]))
}

func serviceNameFromSummary(item agents.AgentSummary) string {
	if name := serviceNameFromFQDN(item.ServiceFQDN); name != "" {
		return name
	}
	return item.Name
}

func serviceNameFromFQDN(fqdn string) string {
	host := strings.TrimSuffix(strings.TrimSpace(fqdn), ".")
	if host == "" {
		return ""
	}
	if i := strings.Index(host, "."); i > 0 {
		return host[:i]
	}
	return host
}

func copyStringMap(values map[string]string) map[string]string {
	if len(values) == 0 {
		return nil
	}
	out := make(map[string]string, len(values))
	for key, value := range values {
		out[key] = value
	}
	return out
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
	if !strings.EqualFold(strings.TrimSpace(readyStatus), "ready") {
		return nil
	}
	return &models.AgentRuntimeCondition{
		Type:               "Ready",
		Status:             "True",
		Reason:             "AgentReady",
		Message:            "Agent is ready.",
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
