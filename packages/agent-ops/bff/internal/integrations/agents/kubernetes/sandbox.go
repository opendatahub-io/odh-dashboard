package kubernetes

import (
	"context"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

var sandboxGVR = schema.GroupVersionResource{
	Group:    "agents.x-k8s.io",
	Version:  "v1beta1",
	Resource: "sandboxes",
}

func listSandboxes(ctx context.Context, dynamicClient dynamic.Interface, namespace, selector string) ([]unstructured.Unstructured, error) {
	list, err := dynamicClient.Resource(sandboxGVR).Namespace(namespace).List(ctx, metav1.ListOptions{LabelSelector: selector})
	if err != nil {
		return nil, err
	}
	return list.Items, nil
}

func getSandbox(ctx context.Context, dynamicClient dynamic.Interface, namespace, name string) (*unstructured.Unstructured, error) {
	return dynamicClient.Resource(sandboxGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
}
