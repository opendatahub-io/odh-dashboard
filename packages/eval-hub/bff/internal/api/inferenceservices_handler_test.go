package api

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	dynamicfake "k8s.io/client-go/dynamic/fake"
)

func TestListInferenceServicesExtractsModelFormatName(t *testing.T) {
	scheme := runtime.NewScheme()

	vllmISVC := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "serving.kserve.io/v1beta1",
			"kind":       "InferenceService",
			"metadata": map[string]interface{}{
				"name":      "llama-model",
				"namespace": "test-ns",
			},
			"spec": map[string]interface{}{
				"predictor": map[string]interface{}{
					"model": map[string]interface{}{
						"modelFormat": map[string]interface{}{
							"name": "vLLM",
						},
						"runtime":    "vllm-cpu-runtime-amd64",
						"storageUri": "oci://quay.io/llama:latest",
					},
				},
			},
			"status": map[string]interface{}{
				"url": "http://llama-model.test-ns.svc.cluster.local/v1",
				"conditions": []interface{}{
					map[string]interface{}{
						"type":   "Ready",
						"status": "True",
					},
				},
			},
		},
	}

	onnxISVC := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "serving.kserve.io/v1beta1",
			"kind":       "InferenceService",
			"metadata": map[string]interface{}{
				"name":      "onnx-model",
				"namespace": "test-ns",
			},
			"spec": map[string]interface{}{
				"predictor": map[string]interface{}{
					"model": map[string]interface{}{
						"modelFormat": map[string]interface{}{
							"name": "onnx",
						},
					},
				},
			},
			"status": map[string]interface{}{
				"url": "http://onnx-model.test-ns.svc.cluster.local/v1",
				"conditions": []interface{}{
					map[string]interface{}{
						"type":   "Ready",
						"status": "True",
					},
				},
			},
		},
	}

	noFormatISVC := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "serving.kserve.io/v1beta1",
			"kind":       "InferenceService",
			"metadata": map[string]interface{}{
				"name":      "legacy-model",
				"namespace": "test-ns",
			},
			"spec": map[string]interface{}{
				"predictor": map[string]interface{}{
					"model": map[string]interface{}{
						"storageUri": "s3://bucket/model",
					},
				},
			},
			"status": map[string]interface{}{
				"url": "http://legacy-model.test-ns.svc.cluster.local/v1",
				"conditions": []interface{}{
					map[string]interface{}{
						"type":   "Ready",
						"status": "True",
					},
				},
			},
		},
	}

	client := dynamicfake.NewSimpleDynamicClient(scheme, vllmISVC, onnxISVC, noFormatISVC)

	result, err := listInferenceServices(context.Background(), client, "test-ns")
	require.NoError(t, err)
	require.Len(t, result.Items, 3)

	itemsByName := map[string]struct {
		ModelFormatName string
		Ready           bool
	}{}
	for _, item := range result.Items {
		itemsByName[item.Name] = struct {
			ModelFormatName string
			Ready           bool
		}{item.ModelFormatName, item.Ready}
	}

	assert.Equal(t, "vLLM", itemsByName["llama-model"].ModelFormatName)
	assert.True(t, itemsByName["llama-model"].Ready)

	assert.Equal(t, "onnx", itemsByName["onnx-model"].ModelFormatName)
	assert.True(t, itemsByName["onnx-model"].Ready)

	assert.Equal(t, "", itemsByName["legacy-model"].ModelFormatName)
	assert.True(t, itemsByName["legacy-model"].Ready)
}
