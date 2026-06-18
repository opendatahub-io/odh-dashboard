package kubernetes

import (
	"testing"

	"github.com/stretchr/testify/assert"
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
)

func TestDeploymentReadyStatus(t *testing.T) {
	replicas := int32(2)
	status := appsv1.DeploymentStatus{
		Replicas:      replicas,
		ReadyReplicas: 2,
		Conditions: []appsv1.DeploymentCondition{
			{Type: appsv1.DeploymentAvailable, Status: "True"},
		},
	}
	assert.Equal(t, statusReady, deploymentReadyStatus(status))
}

func TestJobStatusSucceeded(t *testing.T) {
	status := batchv1.JobStatus{Succeeded: 1}
	assert.Equal(t, statusReady, jobStatus(status))
}
