package kubernetes

import "k8s.io/apimachinery/pkg/runtime/schema"

var sandboxGVR = schema.GroupVersionResource{
	Group:    "agents.x-k8s.io",
	Version:  "v1beta1",
	Resource: "sandboxes",
}
