package pipelines

import (
	"context"
	"errors"
	"testing"

	k8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func dspaItem(name string, status map[string]any) unstructured.Unstructured {
	obj := map[string]any{
		"metadata": map[string]any{"name": name, "namespace": "my-ns"},
		"status":   status,
	}
	return unstructured.Unstructured{Object: obj}
}

func TestGetDSPAStatus(t *testing.T) {
	dspaGVR := schema.GroupVersionResource{
		Group:    "datasciencepipelinesapplications.opendatahub.io",
		Version:  "v1",
		Resource: "datasciencepipelinesapplications",
	}

	newClient := func(items []unstructured.Unstructured) *mockK8sClient {
		return &mockK8sClient{
			discoverResourceGVRFn: func(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error) {
				return dspaGVR, nil
			},
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return &unstructured.UnstructuredList{Items: items}, nil
			},
		}
	}

	ctx := k8s.ContextWithIdentity(context.Background(), &k8s.RequestIdentity{Token: "tok"})

	t.Run("reports ready when the Ready condition is True", func(t *testing.T) {
		svc := newTestPipelineServiceForDiscovery(newClient([]unstructured.Unstructured{
			dspaItem("dspa1", map[string]any{
				"conditions": []any{map[string]any{"type": "Ready", "status": "True"}},
			}),
		}))

		status, err := svc.GetDSPAStatus(ctx, "my-ns")
		if err != nil {
			t.Fatal(err)
		}
		if status.Status != DSPAStatusReady {
			t.Errorf("Status = %q", status.Status)
		}
		if status.DSPAName != "dspa1" {
			t.Errorf("DSPAName = %q", status.DSPAName)
		}
	})

	t.Run("reports starting when the DSPA is not ready", func(t *testing.T) {
		svc := newTestPipelineServiceForDiscovery(newClient([]unstructured.Unstructured{
			dspaItem("dspa1", map[string]any{
				"conditions": []any{map[string]any{"type": "Ready", "status": "False"}},
			}),
		}))

		status, err := svc.GetDSPAStatus(ctx, "my-ns")
		if err != nil {
			t.Fatal(err)
		}
		if status.Status != DSPAStatusStarting {
			t.Errorf("Status = %q", status.Status)
		}
		if status.DSPAName != "dspa1" {
			t.Errorf("DSPAName = %q", status.DSPAName)
		}
	})

	t.Run("reports not-found without error when no DSPA exists", func(t *testing.T) {
		svc := newTestPipelineServiceForDiscovery(newClient(nil))

		status, err := svc.GetDSPAStatus(ctx, "my-ns")
		if err != nil {
			t.Fatal(err)
		}
		if status.Status != DSPAStatusNotFound {
			t.Errorf("Status = %q", status.Status)
		}
		if status.DSPAName != "" {
			t.Errorf("DSPAName = %q", status.DSPAName)
		}
	})

	t.Run("reports starting when Ready is for an older generation", func(t *testing.T) {
		svc := newTestPipelineServiceForDiscovery(newClient([]unstructured.Unstructured{
			{Object: map[string]any{
				"metadata": map[string]any{"name": "dspa1", "namespace": "my-ns", "generation": int64(2)},
				"status": map[string]any{
					"conditions": []any{
						map[string]any{"type": "Ready", "status": "True", "observedGeneration": int64(1)},
					},
				},
			}},
		}))

		status, err := svc.GetDSPAStatus(ctx, "my-ns")
		if err != nil {
			t.Fatal(err)
		}
		if status.Status != DSPAStatusStarting {
			t.Errorf("Status = %q", status.Status)
		}
	})

	t.Run("accepts Ready when observedGeneration is omitted", func(t *testing.T) {
		svc := newTestPipelineServiceForDiscovery(newClient([]unstructured.Unstructured{
			{Object: map[string]any{
				"metadata": map[string]any{"name": "dspa1", "namespace": "my-ns", "generation": int64(2)},
				"status": map[string]any{
					"conditions": []any{
						map[string]any{"type": "Ready", "status": "True"},
					},
				},
			}},
		}))

		status, err := svc.GetDSPAStatus(ctx, "my-ns")
		if err != nil {
			t.Fatal(err)
		}
		if status.Status != DSPAStatusReady {
			t.Errorf("Status = %q", status.Status)
		}
	})

	t.Run("errors when conditions are not an array", func(t *testing.T) {
		svc := newTestPipelineServiceForDiscovery(newClient([]unstructured.Unstructured{
			dspaItem("dspa1", map[string]any{"conditions": "invalid"}),
		}))

		_, err := svc.GetDSPAStatus(ctx, "my-ns")
		if !errors.Is(err, ErrInvalidDSPAConditions) {
			t.Fatalf("err = %v, want ErrInvalidDSPAConditions", err)
		}
	})

	t.Run("errors when a condition entry is not an object", func(t *testing.T) {
		svc := newTestPipelineServiceForDiscovery(newClient([]unstructured.Unstructured{
			dspaItem("dspa1", map[string]any{
				"conditions": []any{"invalid"},
			}),
		}))

		_, err := svc.GetDSPAStatus(ctx, "my-ns")
		if !errors.Is(err, ErrInvalidDSPAConditions) {
			t.Fatalf("err = %v, want ErrInvalidDSPAConditions", err)
		}
	})

	t.Run("rejects an empty namespace", func(t *testing.T) {
		svc := newTestPipelineServiceForDiscovery(newClient(nil))

		_, err := svc.GetDSPAStatus(ctx, "")
		if !errors.Is(err, ErrInvalidInput) {
			t.Fatalf("err = %v, want ErrInvalidInput", err)
		}
	})

	t.Run("reads a fresh list, bypassing the discovery cache", func(t *testing.T) {
		items := []unstructured.Unstructured{
			{Object: map[string]any{
				"metadata": map[string]any{"name": "dspa1", "namespace": "my-ns"},
				"status": map[string]any{
					"conditions": []any{map[string]any{"type": "Ready", "status": "True"}},
					"components": map[string]any{
						"apiServer": map[string]any{"url": "https://ds-pipeline-dspa1.my-ns.svc:8443"},
					},
				},
			}},
		}
		client := &mockK8sClient{
			discoverResourceGVRFn: func(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error) {
				return dspaGVR, nil
			},
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return &unstructured.UnstructuredList{Items: items}, nil
			},
		}
		svc := newTestPipelineServiceForDiscovery(client)

		// Prime the discovery cache with the ready DSPA...
		if _, err := svc.DiscoverReadyDSPA(ctx, "my-ns"); err != nil {
			t.Fatal(err)
		}

		// ...then the server restarts: the live list flips to unready.
		items = []unstructured.Unstructured{
			dspaItem("dspa1", map[string]any{
				"conditions": []any{map[string]any{"type": "Ready", "status": "False"}},
			}),
		}

		status, err := svc.GetDSPAStatus(ctx, "my-ns")
		if err != nil {
			t.Fatal(err)
		}
		if status.Status != DSPAStatusStarting {
			t.Errorf("Status = %q, want starting (fresh list must not report the cached ready state)", status.Status)
		}
	})
}

// TestIsDSPAReady pins the generation-guard semantics shared by DiscoverReadyDSPA
// and GetDSPAStatus.
func TestIsDSPAReady(t *testing.T) {
	t.Run("float64 observedGeneration from JSON decoding is normalized", func(t *testing.T) {
		ready, err := isDSPAReady(map[string]any{
			"metadata": map[string]any{"generation": float64(2)},
			"status": map[string]any{
				"conditions": []any{
					map[string]any{"type": "Ready", "status": "True", "observedGeneration": float64(2)},
				},
			},
		})
		if err != nil {
			t.Fatal(err)
		}
		if !ready {
			t.Error("ready = false, want true")
		}
	})

	t.Run("missing conditions means not ready, not an error", func(t *testing.T) {
		ready, err := isDSPAReady(map[string]any{
			"metadata": map[string]any{"name": "dspa1"},
		})
		if err != nil {
			t.Fatal(err)
		}
		if ready {
			t.Error("ready = true, want false")
		}
	})
}
