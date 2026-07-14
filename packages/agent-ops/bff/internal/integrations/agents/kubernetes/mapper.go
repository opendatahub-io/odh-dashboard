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
	statusReady    = "ready"
	statusRunning  = "running"
	statusStopped  = "stopped"
	statusPending  = "pending"
	statusFailed   = "failed"
)

func agentLabelSelectors() []string {
	return []string{
		fmt.Sprintf("%s=%s", agents.LabelOpenShellManagedBy, agents.OpenShellManagedByValue),
	}
}

func sandboxToSummary(sandbox unstructured.Unstructured, service *agents.AgentService) agents.AgentSummary {
	labels := sandbox.GetLabels()
	annotations := sandbox.GetAnnotations()
	resolved := resolveSandboxService(sandbox, service)
	serviceFQDN := sandboxServiceFQDN(sandbox)

	ports := []agents.AgentServicePort{}
	if resolved != nil {
		ports = resolved.Ports
	}

	return agents.AgentSummary{
		Name:         sandbox.GetName(),
		Namespace:    sandbox.GetNamespace(),
		DisplayName:  mapper.AgentDisplayName(annotations, sandbox.GetName()),
		Description:  mapper.AgentDescription(annotations),
		Framework:    mapper.AgentFramework(annotations),
		Status:       sandboxPhase(sandbox),
		ResourceType: agents.ResolveAgentResourceType(labels),
		WorkloadType: agents.WorkloadTypeSandbox,
		ServiceFQDN:  serviceFQDN,
		Ports:        append([]agents.AgentServicePort(nil), ports...),
		EndpointURL:  sandboxEndpointURL(sandbox, resolved),
		CreatedAt:    formatTimestamp(sandbox.GetCreationTimestamp()),
		LastSyncAt:   sandboxLastSyncTimestamp(sandbox),
	}
}

func sandboxToDetail(sandbox unstructured.Unstructured, service *agents.AgentService) *agents.AgentDetail {
	spec, _ := sandbox.Object["spec"].(map[string]any)
	status, _ := sandbox.Object["status"].(map[string]any)
	labels := sandbox.GetLabels()
	annotations := sandbox.GetAnnotations()
	resolved := resolveSandboxService(sandbox, service)

	return &agents.AgentDetail{
		Metadata: agents.AgentMetadata{
			Name:              sandbox.GetName(),
			Namespace:         sandbox.GetNamespace(),
			Labels:            copyStringMap(labels),
			Annotations:       copyStringMap(annotations),
			CreationTimestamp: formatTimestamp(sandbox.GetCreationTimestamp()),
			UID:               string(sandbox.GetUID()),
		},
		Spec:           spec,
		Status:         status,
		DisplayName:    mapper.AgentDisplayName(annotations, sandbox.GetName()),
		Framework:      mapper.AgentFramework(annotations),
		ContainerImage: mapper.ContainerImageFromSpec(spec),
		ServiceFQDN:    sandboxServiceFQDN(sandbox),
		WorkloadType:   agents.WorkloadTypeSandbox,
		ReadyStatus:    sandboxPhase(sandbox),
		Service:        resolved,
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
	if spec, ok := sandbox.Object["spec"].(map[string]any); ok {
		if mode := strings.TrimSpace(stringField(spec["operatingMode"])); strings.EqualFold(mode, "Suspended") {
			return statusStopped
		}
	}

	status, ok := sandbox.Object["status"].(map[string]any)
	if !ok {
		return statusPending
	}
	return normalizeSandboxPhase(stringField(status["phase"]))
}

func normalizeSandboxPhase(phase string) string {
	switch strings.ToLower(strings.TrimSpace(phase)) {
	case statusReady:
		return statusReady
	case statusRunning:
		return statusRunning
	case statusStopped, "suspended":
		return statusStopped
	case statusPending, "provisioning", "not ready", "notready":
		return statusPending
	case statusFailed, "error":
		return statusFailed
	case "":
		return statusPending
	default:
		return statusPending
	}
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

	spec, _ := sandbox.Object["spec"].(map[string]any)
	ports := extractContainerPortsFromSpec(spec)
	if len(ports) == 0 {
		return &agents.AgentService{
			Name:  serviceName,
			Ports: nil,
		}
	}
	return &agents.AgentService{
		Name:  serviceName,
		Ports: ports,
	}
}

func sandboxServiceFQDN(sandbox unstructured.Unstructured) string {
	status, ok := sandbox.Object["status"].(map[string]any)
	if !ok {
		return ""
	}
	return stringField(status["serviceFQDN"])
}

func extractContainerPortsFromSpec(spec map[string]any) []agents.AgentServicePort {
	if spec == nil {
		return nil
	}

	seen := make(map[string]struct{})
	ports := make([]agents.AgentServicePort, 0)

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
		if !ok {
			continue
		}
		for _, rawContainer := range containers {
			container, ok := rawContainer.(map[string]any)
			if !ok {
				continue
			}
			rawPorts, ok := container["ports"].([]any)
			if !ok {
				continue
			}
			for _, rawPort := range rawPorts {
				portMap, ok := rawPort.(map[string]any)
				if !ok {
					continue
				}
				port := agents.AgentServicePort{
					Name:     stringField(portMap["name"]),
					Protocol: stringField(portMap["protocol"]),
				}
				switch v := portMap["containerPort"].(type) {
				case int:
					port.Port = v
				case int32:
					port.Port = int(v)
				case int64:
					port.Port = int(v)
				case float64:
					port.Port = int(v)
				}
				if port.Port <= 0 {
					continue
				}
				if port.Name == "" {
					port.Name = fmt.Sprintf("port-%d", port.Port)
				}
				key := fmt.Sprintf("%s:%d", port.Name, port.Port)
				if _, exists := seen[key]; exists {
					continue
				}
				seen[key] = struct{}{}
				ports = append(ports, port)
			}
		}
	}

	return ports
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
