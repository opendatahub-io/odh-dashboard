package kubernetes

import (
	"context"
	"testing"

	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func TestGetKueueWorkloadStatusesMatchesEvalHubIDsAndAggregatesStates(t *testing.T) {
	client := newKueueFakeClient(
		workload("queued", "evaluation-queued", "default", true),
		workload("finished", "evaluation-finished", "gpu-default", true,
			kueueCondition("Admitted", "True", "Admitted", "The workload is admitted"),
			kueueCondition("Finished", "True", "Succeeded", "The workload finished"),
		),
		workload("preempted", "evaluation-preempted", "default", false,
			kueueCondition("Evicted", "True", "Preempted", "The workload was preempted"),
		),
		workload("unrelated", "another-evaluation", "default", true),
	)

	response, err := getKueueWorkloadStatuses(
		context.Background(),
		client,
		testNamespace,
		[]string{"evaluation-queued", "evaluation-finished", "evaluation-preempted", "not-found"},
	)
	if err != nil {
		t.Fatalf("getKueueWorkloadStatuses() error = %v", err)
	}

	if len(response.Items) != 3 {
		t.Fatalf("items = %+v, want 3 matched evaluations", response.Items)
	}
	want := []struct {
		evaluationID string
		queueName    string
		state        models.KueueWorkloadState
	}{
		{"evaluation-queued", "default", models.KueueWorkloadStateQueued},
		{"evaluation-finished", "gpu-default", models.KueueWorkloadStateFinished},
		{"evaluation-preempted", "default", models.KueueWorkloadStatePreempted},
	}
	for index, expected := range want {
		item := response.Items[index]
		if item.EvaluationID != expected.evaluationID || item.QueueName != expected.queueName || item.State != expected.state {
			t.Errorf("item[%d] = %+v, want evaluation=%q queue=%q state=%q", index, item, expected.evaluationID, expected.queueName, expected.state)
		}
	}
}

func TestGetKueueWorkloadStatusesReportsAdmittedForAnActiveSuiteWorkload(t *testing.T) {
	client := newKueueFakeClient(
		workload("completed-benchmark", "suite-evaluation", "default", true,
			kueueCondition("Admitted", "True", "Admitted", "The workload is admitted"),
			kueueCondition("Finished", "True", "Succeeded", "The workload finished"),
		),
		workload("active-benchmark", "suite-evaluation", "default", true,
			kueueCondition("Admitted", "True", "Admitted", "The workload is admitted"),
		),
	)

	response, err := getKueueWorkloadStatuses(context.Background(), client, testNamespace, []string{"suite-evaluation"})
	if err != nil {
		t.Fatalf("getKueueWorkloadStatuses() error = %v", err)
	}
	if len(response.Items) != 1 || response.Items[0].State != models.KueueWorkloadStateAdmitted {
		t.Fatalf("items = %+v, want active suite to be admitted", response.Items)
	}
}

func workload(name, evaluationID, queueName string, useAnnotation bool, conditions ...map[string]interface{}) *unstructured.Unstructured {
	metadata := map[string]interface{}{}
	if useAnnotation {
		metadata["annotations"] = map[string]interface{}{evalHubJobIDAnnotation: evaluationID}
	} else {
		metadata["labels"] = map[string]interface{}{evalHubJobIDLabel: evaluationID}
	}
	conditionValues := make([]interface{}, len(conditions))
	for index := range conditions {
		conditionValues[index] = conditions[index]
	}
	return &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "kueue.x-k8s.io/v1beta2",
		"kind":       "Workload",
		"metadata": map[string]interface{}{
			"name":      name,
			"namespace": testNamespace,
		},
		"spec": map[string]interface{}{
			"queueName": queueName,
			"podSets": []interface{}{map[string]interface{}{
				"template": map[string]interface{}{"metadata": metadata},
			}},
		},
		"status": map[string]interface{}{"conditions": conditionValues},
	}}
}

func kueueCondition(conditionType, status, reason, message string) map[string]interface{} {
	return map[string]interface{}{
		"type":    conditionType,
		"status":  status,
		"reason":  reason,
		"message": message,
	}
}
