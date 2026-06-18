package kubernetes

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/mapper"
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func agentLabelSelector() string {
	return fmt.Sprintf("%s=%s", agents.LabelAgentType, agents.AgentTypeAgent)
}

func deploymentToSummary(deployment appsv1.Deployment, service *corev1.Service) agents.AgentSummary {
	metadata := deployment.ObjectMeta
	endpointURL := ""
	if service != nil {
		endpointURL = mapper.BuildPrimaryEndpointURL(service.Name, metadata.Namespace, mapServicePorts(service))
	}

	return agents.AgentSummary{
		Name:         metadata.Name,
		Namespace:    metadata.Namespace,
		Description:  mapper.AgentDescription(metadata.Annotations),
		Status:       deploymentReadyStatus(deployment.Status),
		ResourceType: metadata.Labels[agents.LabelAgentType],
		WorkloadType: workloadTypeFromLabels(metadata.Labels, agents.WorkloadTypeDeployment),
		EndpointURL:  endpointURL,
		CreatedAt:    formatTimestamp(metadata.CreationTimestamp),
		LastSyncAt:   lastSyncTimestamp(metadata.CreationTimestamp, deployment.Status),
	}
}

func statefulSetToSummary(statefulSet appsv1.StatefulSet, service *corev1.Service) agents.AgentSummary {
	metadata := statefulSet.ObjectMeta
	endpointURL := ""
	if service != nil {
		endpointURL = mapper.BuildPrimaryEndpointURL(service.Name, metadata.Namespace, mapServicePorts(service))
	}

	return agents.AgentSummary{
		Name:         metadata.Name,
		Namespace:    metadata.Namespace,
		Description:  mapper.AgentDescription(metadata.Annotations),
		Status:       statefulSetReadyStatus(statefulSet.Status),
		ResourceType: metadata.Labels[agents.LabelAgentType],
		WorkloadType: workloadTypeFromLabels(metadata.Labels, agents.WorkloadTypeStatefulSet),
		EndpointURL:  endpointURL,
		CreatedAt:    formatTimestamp(metadata.CreationTimestamp),
		LastSyncAt:   lastSyncTimestamp(metadata.CreationTimestamp, statefulSet.Status),
	}
}

func jobToSummary(job batchv1.Job) agents.AgentSummary {
	metadata := job.ObjectMeta
	return agents.AgentSummary{
		Name:         metadata.Name,
		Namespace:    metadata.Namespace,
		Description:  mapper.AgentDescription(metadata.Annotations),
		Status:       jobStatus(job.Status),
		ResourceType: metadata.Labels[agents.LabelAgentType],
		WorkloadType: workloadTypeFromLabels(metadata.Labels, agents.WorkloadTypeJob),
		EndpointURL:  "",
		CreatedAt:    formatTimestamp(metadata.CreationTimestamp),
		LastSyncAt:   lastSyncTimestamp(metadata.CreationTimestamp, job.Status),
	}
}

func deploymentToDetail(deployment appsv1.Deployment, service *corev1.Service) *agents.AgentDetail {
	return workloadToDetail(
		deployment.ObjectMeta,
		deployment.Spec,
		deployment.Status,
		deploymentReadyStatus(deployment.Status),
		workloadTypeFromLabels(deployment.Labels, agents.WorkloadTypeDeployment),
		service,
	)
}

func statefulSetToDetail(statefulSet appsv1.StatefulSet, service *corev1.Service) *agents.AgentDetail {
	return workloadToDetail(
		statefulSet.ObjectMeta,
		statefulSet.Spec,
		statefulSet.Status,
		statefulSetReadyStatus(statefulSet.Status),
		workloadTypeFromLabels(statefulSet.Labels, agents.WorkloadTypeStatefulSet),
		service,
	)
}

func jobToDetail(job batchv1.Job) *agents.AgentDetail {
	return workloadToDetail(
		job.ObjectMeta,
		job.Spec,
		job.Status,
		jobStatus(job.Status),
		workloadTypeFromLabels(job.Labels, agents.WorkloadTypeJob),
		nil,
	)
}

func workloadToDetail(
	metadata metav1.ObjectMeta,
	spec any,
	status any,
	readyStatus string,
	workloadType string,
	service *corev1.Service,
) *agents.AgentDetail {
	return &agents.AgentDetail{
		Metadata: agents.AgentMetadata{
			Name:              metadata.Name,
			Namespace:         metadata.Namespace,
			Labels:            copyStringMap(metadata.Labels),
			Annotations:       copyStringMap(metadata.Annotations),
			CreationTimestamp: formatTimestamp(metadata.CreationTimestamp),
			UID:               string(metadata.UID),
		},
		Spec:         toMap(spec),
		Status:       toMap(status),
		WorkloadType: workloadType,
		ReadyStatus:  readyStatus,
		Service:      mapService(service),
	}
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

func workloadTypeFromLabels(labels map[string]string, fallback string) string {
	if labels != nil {
		if value := labels[agents.LabelWorkloadType]; value != "" {
			return value
		}
	}
	return fallback
}

func formatTimestamp(timestamp metav1.Time) string {
	if timestamp.IsZero() {
		return ""
	}
	return timestamp.UTC().Format(time.RFC3339Nano)
}

func lastSyncTimestamp(created metav1.Time, status any) string {
	createdAt := formatTimestamp(created)
	statusMap := toMap(status)
	if statusMap == nil {
		return createdAt
	}
	if latest := mapper.LatestConditionTime(statusMap); !latest.IsZero() {
		return latest.UTC().Format(time.RFC3339Nano)
	}
	return createdAt
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

func toMap(value any) map[string]any {
	if value == nil {
		return nil
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return nil
	}
	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil
	}
	return out
}
