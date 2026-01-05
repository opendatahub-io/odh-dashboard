package constants

import "k8s.io/apimachinery/pkg/runtime/schema"

var (
	TokenPolicyGvr = schema.GroupVersionResource{
		Group:    "kuadrant.io",
		Version:  "v1alpha1",
		Resource: "tokenratelimitpolicies",
	}

	RatePolicyGvr = schema.GroupVersionResource{
		Group:    "kuadrant.io",
		Version:  "v1",
		Resource: "ratelimitpolicies",
	}
)
