package kubernetes

import (
	"context"
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func TestListHardwareProfilesReturnsOnlyQueueCompatibleProfiles(t *testing.T) {
	client := newKueueFakeClient(
		namespaceObject(map[string]interface{}{kueueManagedLabel: "true"}),
		managedDataScienceCluster(),
		localQueue("gpu-default"),
		hardwareProfile("gpu-small", "GPU Small", true, "Queue", "gpu-default", nil),
		hardwareProfile("missing-queue", "Missing Queue", true, "Queue", "does-not-exist", nil),
		hardwareProfile("direct", "Direct", true, "Direct", "", nil),
		hardwareProfile("disabled", "Disabled", true, "Queue", "gpu-default", map[string]interface{}{
			"opendatahub.io/disabled": "true",
		}),
		hardwareProfile("spec-disabled", "Spec Disabled", false, "Queue", "gpu-default", nil),
	)

	response, err := listHardwareProfiles(context.Background(), client, testNamespace, testNamespace)
	if err != nil {
		t.Fatalf("listHardwareProfiles() error = %v", err)
	}

	if len(response.Items) != 1 {
		t.Fatalf("listHardwareProfiles() returned %d items, want 1: %+v", len(response.Items), response.Items)
	}
	if response.Items[0].Name != "gpu-small" {
		t.Fatalf("listHardwareProfiles() returned %q, want gpu-small", response.Items[0].Name)
	}
}

func TestListHardwareProfilesWarnsWhenNoLocalQueuesExist(t *testing.T) {
	client := newKueueFakeClient(
		namespaceObject(map[string]interface{}{kueueManagedLabel: "true"}),
		managedDataScienceCluster(),
	)

	response, err := listHardwareProfiles(context.Background(), client, testNamespace, testNamespace)
	if err != nil {
		t.Fatalf("listHardwareProfiles() error = %v", err)
	}
	if len(response.Items) != 0 {
		t.Fatalf("listHardwareProfiles() returned items = %+v, want none", response.Items)
	}
	if response.Warning == "" {
		t.Fatal("listHardwareProfiles() warning is empty, want LocalQueue warning")
	}
}

func TestListHardwareProfilesUsesPlatformNamespaceForProfilesAndEvaluationNamespaceForQueues(t *testing.T) {
	platformNamespace := "redhat-ods-applications"
	client := newKueueFakeClient(
		namespaceObject(map[string]interface{}{kueueManagedLabel: "true"}),
		managedDataScienceCluster(),
		localQueueInNamespace("default", testNamespace),
		hardwareProfileInNamespace("evalhub-cpu", "EvalHub CPU", true, "Queue", "default", nil, testNamespace),
		hardwareProfileInNamespace("platform-cpu", "Platform CPU", true, "Queue", "default", nil, platformNamespace),
	)

	response, err := listHardwareProfiles(context.Background(), client, testNamespace, platformNamespace)
	if err != nil {
		t.Fatalf("listHardwareProfiles() error = %v", err)
	}
	if len(response.Items) != 1 || response.Items[0].Name != "platform-cpu" {
		t.Fatalf("listHardwareProfiles() returned %+v, want platform-cpu", response.Items)
	}
}

func TestGetMissingHardwareProfileLocalQueueName(t *testing.T) {
	platformNamespace := "redhat-ods-applications"
	client := newKueueFakeClient(
		namespaceObject(map[string]interface{}{kueueManagedLabel: "true"}),
		managedDataScienceCluster(),
		localQueue("gpu-default"),
		hardwareProfileInNamespace("available", "Available", true, "Queue", "gpu-default", nil, platformNamespace),
		hardwareProfileInNamespace("stale", "Stale", true, "Queue", "removed-queue", nil, platformNamespace),
	)

	queue, missing, err := getMissingHardwareProfileLocalQueueName(
		context.Background(),
		client,
		testNamespace,
		platformNamespace,
		"stale",
	)
	if err != nil {
		t.Fatalf("getMissingHardwareProfileLocalQueueName() error = %v", err)
	}
	if !missing || queue != "removed-queue" {
		t.Fatalf("missing LocalQueue = (%q, %t), want (removed-queue, true)", queue, missing)
	}

	queue, missing, err = getMissingHardwareProfileLocalQueueName(
		context.Background(),
		client,
		testNamespace,
		platformNamespace,
		"available",
	)
	if err != nil {
		t.Fatalf("getMissingHardwareProfileLocalQueueName() error = %v", err)
	}
	if missing || queue != "" {
		t.Fatalf("available LocalQueue = (%q, %t), want (empty, false)", queue, missing)
	}
}

func hardwareProfile(
	name string,
	displayName string,
	enabled bool,
	schedulingType string,
	localQueueName string,
	annotations map[string]interface{},
) *unstructured.Unstructured {
	return hardwareProfileInNamespace(name, displayName, enabled, schedulingType, localQueueName, annotations, testNamespace)
}

func hardwareProfileInNamespace(
	name string,
	displayName string,
	enabled bool,
	schedulingType string,
	localQueueName string,
	annotations map[string]interface{},
	namespace string,
) *unstructured.Unstructured {
	metadata := map[string]interface{}{
		"name":      name,
		"namespace": namespace,
	}
	if annotations != nil {
		metadata["annotations"] = annotations
	}
	return &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "infrastructure.opendatahub.io/v1",
		"kind":       "HardwareProfile",
		"metadata":   metadata,
		"spec": map[string]interface{}{
			"enabled": enabled,
			"scheduling": map[string]interface{}{
				"type": schedulingType,
				"kueue": map[string]interface{}{
					"localQueueName": localQueueName,
				},
			},
			"identifiers": []interface{}{
				map[string]interface{}{
					"identifier":   "cpu",
					"displayName":  displayName,
					"defaultCount": int64(1),
				},
			},
		},
	}}
}
