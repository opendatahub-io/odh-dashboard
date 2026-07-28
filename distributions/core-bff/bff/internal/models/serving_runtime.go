package models

import "k8s.io/apimachinery/pkg/runtime/schema"

// ServingRuntimeGVR is the GroupVersionResource for KServe ServingRuntime CRDs.
var ServingRuntimeGVR = schema.GroupVersionResource{
	Group:    "serving.kserve.io",
	Version:  "v1alpha1",
	Resource: "servingruntimes",
}
