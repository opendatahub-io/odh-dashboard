package kubernetes

import (
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
)

const (
	statusReady    = "Ready"
	statusNotReady = "Not Ready"
)

func deploymentReadyStatus(status appsv1.DeploymentStatus) string {
	for _, condition := range status.Conditions {
		if condition.Type == appsv1.DeploymentAvailable && condition.Status == "True" {
			return statusReady
		}
	}

	if status.Replicas > 0 && status.ReadyReplicas >= status.Replicas {
		return statusReady
	}

	return statusNotReady
}

func statefulSetReadyStatus(status appsv1.StatefulSetStatus) string {
	replicas := status.Replicas
	if replicas > 0 && status.ReadyReplicas >= replicas {
		return statusReady
	}
	return statusNotReady
}

func jobStatus(status batchv1.JobStatus) string {
	if status.Succeeded > 0 {
		return statusReady
	}
	if status.Failed > 0 {
		return statusNotReady
	}
	if status.Active > 0 {
		return "Running"
	}
	return statusNotReady
}
