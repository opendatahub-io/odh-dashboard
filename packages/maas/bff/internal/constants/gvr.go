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

	// OpenShift Groups API - may not exist if using external OIDC
	GroupsGvr = schema.GroupVersionResource{
		Group:    "user.openshift.io",
		Version:  "v1",
		Resource: "groups",
	}
)
