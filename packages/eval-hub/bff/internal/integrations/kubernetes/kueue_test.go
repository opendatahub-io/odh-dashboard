package kubernetes

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	k8stesting "k8s.io/client-go/testing"
)

const testNamespace = "evalhub-test"

func TestGetKueueAvailability(t *testing.T) {
	tests := []struct {
		name                 string
		namespaceLabels      map[string]interface{}
		dataScienceCluster   *unstructured.Unstructured
		externalKueue        *unstructured.Unstructured
		localQueues          []*unstructured.Unstructured
		localQueuesNotFound  bool
		wantEnabled          bool
		wantSchedulingReady  bool
		wantClusterEnabled   bool
		wantNamespaceManaged bool
		wantQueueNames       []string
	}{
		{
			name: "enabled when cluster and namespace are managed and a LocalQueue exists",
			namespaceLabels: map[string]interface{}{
				kueueManagedLabel: "true",
			},
			dataScienceCluster: managedDataScienceCluster(),
			localQueues: []*unstructured.Unstructured{
				localQueue("gpu-default"),
			},
			wantEnabled:          true,
			wantSchedulingReady:  true,
			wantClusterEnabled:   true,
			wantNamespaceManaged: true,
			wantQueueNames:       []string{"gpu-default"},
		},
		{
			name: "enabled when the external Kueue operator is available",
			namespaceLabels: map[string]interface{}{
				legacyKueueManagedLabel: "true",
			},
			externalKueue: externalKueue(true),
			localQueues: []*unstructured.Unstructured{
				localQueue("default"),
			},
			wantEnabled:          true,
			wantSchedulingReady:  true,
			wantClusterEnabled:   true,
			wantNamespaceManaged: true,
			wantQueueNames:       []string{"default"},
		},
		{
			name: "reports an available external Kueue cluster without LocalQueues",
			namespaceLabels: map[string]interface{}{
				legacyKueueManagedLabel: "true",
			},
			externalKueue:        externalKueue(true),
			wantEnabled:          true,
			wantClusterEnabled:   true,
			wantNamespaceManaged: true,
			wantQueueNames:       []string{},
		},
		{
			name:               "disabled when the namespace is not managed",
			namespaceLabels:    map[string]interface{}{},
			dataScienceCluster: managedDataScienceCluster(),
			wantClusterEnabled: true,
			wantQueueNames:     []string{},
		},
		{
			name: "disabled when no LocalQueues exist",
			namespaceLabels: map[string]interface{}{
				kueueManagedLabel: "true",
			},
			dataScienceCluster:   managedDataScienceCluster(),
			wantEnabled:          true,
			wantClusterEnabled:   true,
			wantNamespaceManaged: true,
			wantQueueNames:       []string{},
		},
		{
			name: "disabled when Kueue is not managed in the DataScienceCluster",
			namespaceLabels: map[string]interface{}{
				kueueManagedLabel: "true",
			},
			dataScienceCluster:   unmanagedDataScienceCluster(),
			externalKueue:        externalKueue(false),
			wantNamespaceManaged: true,
			wantQueueNames:       []string{},
		},
		{
			name: "disabled when no DataScienceCluster exists",
			namespaceLabels: map[string]interface{}{
				kueueManagedLabel: "true",
			},
			localQueuesNotFound:  true,
			wantNamespaceManaged: true,
			wantQueueNames:       []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			objects := []runtime.Object{namespaceObject(tt.namespaceLabels)}
			if tt.dataScienceCluster != nil {
				objects = append(objects, tt.dataScienceCluster)
			}
			if tt.externalKueue != nil {
				objects = append(objects, tt.externalKueue)
			}
			for _, queue := range tt.localQueues {
				objects = append(objects, queue)
			}

			client := newKueueFakeClient(objects...)
			if tt.localQueuesNotFound {
				client.PrependReactor("list", localQueueResource, func(k8stesting.Action) (bool, runtime.Object, error) {
					return true, nil, k8serrors.NewNotFound(schema.GroupResource{Group: kueueGroup, Resource: localQueueResource}, testNamespace)
				})
			}
			availability, err := getKueueAvailability(context.Background(), client, testNamespace)
			if err != nil {
				t.Fatalf("getKueueAvailability() error = %v", err)
			}

			if availability.Enabled != tt.wantEnabled {
				t.Errorf("Enabled = %t, want %t", availability.Enabled, tt.wantEnabled)
			}
			if availability.SchedulingReady != tt.wantSchedulingReady {
				t.Errorf("SchedulingReady = %t, want %t", availability.SchedulingReady, tt.wantSchedulingReady)
			}
			if availability.ClusterEnabled != tt.wantClusterEnabled {
				t.Errorf("ClusterEnabled = %t, want %t", availability.ClusterEnabled, tt.wantClusterEnabled)
			}
			if availability.NamespaceManaged != tt.wantNamespaceManaged {
				t.Errorf("NamespaceManaged = %t, want %t", availability.NamespaceManaged, tt.wantNamespaceManaged)
			}
			if len(availability.LocalQueueNames) != len(tt.wantQueueNames) {
				t.Fatalf("LocalQueueNames = %v, want %v", availability.LocalQueueNames, tt.wantQueueNames)
			}
			for i, name := range tt.wantQueueNames {
				if availability.LocalQueueNames[i] != name {
					t.Errorf("LocalQueueNames[%d] = %q, want %q", i, availability.LocalQueueNames[i], name)
				}
			}
		})
	}
}

func TestKueueAvailabilityCacheSharesInFlightLookupAndReturnsClones(t *testing.T) {
	cache := newKueueAvailabilityCache(time.Minute)
	var loads atomic.Int32
	started := make(chan struct{})
	release := make(chan struct{})
	load := func() (*models.KueueAvailability, error) {
		loads.Add(1)
		close(started)
		<-release
		return &models.KueueAvailability{Enabled: true, SchedulingReady: true, LocalQueueNames: []string{"gpu-default"}}, nil
	}

	type result struct {
		availability *models.KueueAvailability
		err          error
	}
	results := make(chan result, 2)
	go func() {
		availability, err := cache.get(context.Background(), "user-a:namespace-a", load)
		results <- result{availability: availability, err: err}
	}()
	<-started
	go func() {
		availability, err := cache.get(context.Background(), "user-a:namespace-a", load)
		results <- result{availability: availability, err: err}
	}()
	close(release)

	for range 2 {
		result := <-results
		if result.err != nil {
			t.Fatalf("cache lookup returned an error: %v", result.err)
		}
	}
	if loads.Load() != 1 {
		t.Fatalf("cache loader calls = %d, want 1", loads.Load())
	}

	first, err := cache.get(context.Background(), "user-a:namespace-a", load)
	if err != nil {
		t.Fatalf("cached lookup returned an error: %v", err)
	}
	first.LocalQueueNames[0] = "mutated"
	second, err := cache.get(context.Background(), "user-a:namespace-a", load)
	if err != nil {
		t.Fatalf("second cached lookup returned an error: %v", err)
	}
	if loads.Load() != 1 {
		t.Fatalf("cache loader calls after cached lookup = %d, want 1", loads.Load())
	}
	if second.LocalQueueNames[0] != "gpu-default" {
		t.Fatalf("cached availability was mutated: %v", second.LocalQueueNames)
	}
}

func TestGetKueueAvailabilityReturnsDataScienceClusterListError(t *testing.T) {
	client := newKueueFakeClient(namespaceObject(map[string]interface{}{
		kueueManagedLabel: "true",
	}))
	client.PrependReactor("list", localQueueResource, func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewNotFound(schema.GroupResource{Group: kueueGroup, Resource: localQueueResource}, testNamespace)
	})
	client.PrependReactor("list", dscResource, func(action k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, errors.New("permission denied")
	})

	if _, err := getKueueAvailability(context.Background(), client, testNamespace); err == nil {
		t.Fatal("getKueueAvailability() error = nil, want DataScienceCluster list error")
	}
}

func newKueueFakeClient(objects ...runtime.Object) *dynamicfake.FakeDynamicClient {
	return dynamicfake.NewSimpleDynamicClientWithCustomListKinds(
		runtime.NewScheme(),
		map[schema.GroupVersionResource]string{
			{Version: "v1", Resource: "namespaces"}: "NamespaceList",
			dscGVR:                                  "DataScienceClusterList",
			kueueOperatorGVR:                        "KueueList",
			localQueueGVR:                           "LocalQueueList",
			workloadGVR:                             "WorkloadList",
			hardwareProfileGVR:                      "HardwareProfileList",
		},
		objects...,
	)
}

func namespaceObject(labels map[string]interface{}) *unstructured.Unstructured {
	return &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "v1",
		"kind":       "Namespace",
		"metadata": map[string]interface{}{
			"name":   testNamespace,
			"labels": labels,
		},
	}}
}

func managedDataScienceCluster() *unstructured.Unstructured {
	return dataScienceCluster("Managed")
}

func unmanagedDataScienceCluster() *unstructured.Unstructured {
	return dataScienceCluster("Removed")
}

func externalKueue(available bool) *unstructured.Unstructured {
	status := "False"
	if available {
		status = "True"
	}
	return &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "kueue.openshift.io/v1",
		"kind":       "Kueue",
		"metadata": map[string]interface{}{
			"name": "cluster",
		},
		"spec": map[string]interface{}{
			"managementState": "Managed",
		},
		"status": map[string]interface{}{
			"conditions": []interface{}{
				map[string]interface{}{
					"type":   "Available",
					"status": status,
				},
			},
		},
	}}
}

func dataScienceCluster(managementState string) *unstructured.Unstructured {
	return &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "datasciencecluster.opendatahub.io/v2",
		"kind":       "DataScienceCluster",
		"metadata": map[string]interface{}{
			"name": "default-dsc",
		},
		"spec": map[string]interface{}{
			"components": map[string]interface{}{
				"kueue": map[string]interface{}{
					"managementState": managementState,
				},
			},
		},
	}}
}

func localQueue(name string) *unstructured.Unstructured {
	return localQueueInNamespace(name, testNamespace)
}

func localQueueInNamespace(name, namespace string) *unstructured.Unstructured {
	return &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "kueue.x-k8s.io/v1beta2",
		"kind":       "LocalQueue",
		"metadata": map[string]interface{}{
			"name":      name,
			"namespace": namespace,
		},
		"spec": map[string]interface{}{
			"clusterQueue": "gpu-cluster",
		},
	}}
}
