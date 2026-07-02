package kubernetes

import (
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
)

// Clientset wraps kubernetes.Interface for testing.
type Clientset interface {
	kubernetes.Interface
}

// DynamicClient wraps dynamic.Interface for testing.
type DynamicClient interface {
	dynamic.Interface
}

// Compile-time interface checks.
var _ Clientset = (*kubernetes.Clientset)(nil)
var _ DynamicClient = (*dynamic.DynamicClient)(nil)
