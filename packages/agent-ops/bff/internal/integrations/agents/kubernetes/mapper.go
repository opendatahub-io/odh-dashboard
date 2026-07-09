package kubernetes

import (
	"fmt"
	"strings"
	"time"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/mapper"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

const (
	statusReady    = "Ready"
	statusNotReady = "Not Ready"
)

func agentLabelSelectors() []string {
	return []string{
		fmt.Sprintf("%s=%s", agents.LabelAgentType, agents.AgentTypeAgent),
		fmt.Sprintf("%s=%s", agents.LabelOpenShellManagedBy, agents.OpenShellManagedByValue),
	}
}

func sandboxToSummary(sandbox unstructured.Unstructured, service *agents.AgentService) agents.AgentSummary {
	labels := sandbox.GetLabels()
	annotations := sandbox.GetAnnotations()

	return agents.AgentSummary{
		Name:         sandbox.GetName(),
		Namespace:    sandbox.GetNamespace(),
		Description:  mapper.AgentDescription(annotations),
		Status:       sandboxPhase(sandbox),
		ResourceType: agents.ResolveAgentResourceType(labels),
		WorkloadType: agents.WorkloadTypeSandbox,
		EndpointURL:  sandboxEndpointURL(sandbox, service),
		CreatedAt:    formatTimestamp(sandbox.GetCreationTimestamp()),
		LastSyncAt:   sandboxLastSyncTimestamp(sandbox),
	}
}

func sandboxToDetail(sandbox unstructured.Unstructured, service *agents.AgentService) *agents.AgentDetail {
	spec, _ := sandbox.Object["spec"].(map[string]any)
	status, _ := sandbox.Object["status"].(map[string]any)
	labels := sandbox.GetLabels()
	annotations := sandbox.GetAnnotations()

	return &agents.AgentDetail{
		Metadata: agents.AgentMetadata{
			Name:              sandbox.GetName(),
			Namespace:         sandbox.GetNamespace(),
			Labels:            copyStringMap(labels),
			Annotations:       copyStringMap(annotations),
			CreationTimestamp: formatTimestamp(sandbox.GetCreationTimestamp()),
			UID:               string(sandbox.GetUID()),
		},
		Spec:         spec,
		Status:       status,
		WorkloadType: agents.WorkloadTypeSandbox,
		ReadyStatus:  sandboxPhase(sandbox),
		Service:      resolveSandboxService(sandbox, service),
	}
}

func resolveSandboxService(sandbox unstructured.Unstructured, service *agents.AgentService) *agents.AgentService {
	if service != nil {
		return service
	}
	return buildSandboxServiceFromStatus(sandbox)
}

func sandboxEndpointURL(sandbox unstructured.Unstructured, service *agents.AgentService) string {
	resolved := resolveSandboxService(sandbox, service)
	if resolved == nil {
		return ""
	}
	return mapper.BuildPrimaryEndpointURL(resolved.Name, sandbox.GetNamespace(), resolved.Ports)
}

func sandboxPhase(sandbox unstructured.Unstructured) string {
	status, ok := sandbox.Object["status"].(map[string]any)
	if !ok {
		return statusNotReady
	}
	if phase := stringField(status["phase"]); phase != "" {
		return phase
	}
	return statusNotReady
}

func buildSandboxServiceFromStatus(sandbox unstructured.Unstructured) *agents.AgentService {
	status, ok := sandbox.Object["status"].(map[string]any)
	if !ok {
		return nil
	}
	fqdn := stringField(status["serviceFQDN"])
	if fqdn == "" {
		return nil
	}
	serviceName := serviceNameFromFQDN(fqdn)
	if serviceName == "" {
		return nil
	}
	return &agents.AgentService{
		Name: serviceName,
		Ports: []agents.AgentServicePort{
			{Name: "http", Port: int(defaultSvcPort)},
		},
	}
}

// serviceNameFromFQDN extracts the Kubernetes Service name from a cluster DNS FQDN
// (e.g. "my-svc.ns.svc.cluster.local" → "my-svc").
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

func sandboxLastSyncTimestamp(sandbox unstructured.Unstructured) string {
	createdAt := formatTimestamp(sandbox.GetCreationTimestamp())
	status, ok := sandbox.Object["status"].(map[string]any)
	if !ok {
		return createdAt
	}
	if latest := latestConditionTimeFromStatus(status); !latest.IsZero() {
		return latest.UTC().Format(time.RFC3339Nano)
	}
	return createdAt
}

func latestConditionTimeFromStatus(status map[string]any) time.Time {
	raw, ok := status["conditions"]
	if !ok {
		return time.Time{}
	}
	items, ok := raw.([]any)
	if !ok {
		return time.Time{}
	}

	var latest time.Time
	for _, item := range items {
		cond, ok := item.(map[string]any)
		if !ok {
			continue
		}
		ts := parseConditionTime(
			stringField(cond["lastTransitionTime"]),
			stringField(cond["last_transition_time"]),
		)
		if ts.After(latest) {
			latest = ts
		}
	}
	return latest
}

func parseConditionTime(values ...string) time.Time {
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

func mapService(service *corev1.Service) *agents.AgentService {
	if service == nil {
		return nil
	}
	return &agents.AgentService{
		Name:      service.Name,
		Type:      string(service.Spec.Type),
		ClusterIP: service.Spec.ClusterIP,
		Ports:     mapServicePorts(service),
	}
}

func mapServicePorts(service *corev1.Service) []agents.AgentServicePort {
	if service == nil {
		return nil
	}
	ports := make([]agents.AgentServicePort, 0, len(service.Spec.Ports))
	for _, port := range service.Spec.Ports {
		ports = append(ports, agents.AgentServicePort{
			Name:       port.Name,
			Port:       int(port.Port),
			TargetPort: port.TargetPort,
			Protocol:   string(port.Protocol),
		})
	}
	return ports
}

func formatTimestamp(timestamp metav1.Time) string {
	if timestamp.IsZero() {
		return ""
	}
	return timestamp.UTC().Format(time.RFC3339Nano)
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
