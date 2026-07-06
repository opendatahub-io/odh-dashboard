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

	MaaSSubscriptionGvr = schema.GroupVersionResource{
		Group:    "maas.opendatahub.io",
		Version:  "v1alpha1",
		Resource: "maassubscriptions",
	}

	MaaSAuthPolicyGvr = schema.GroupVersionResource{
		Group:    "maas.opendatahub.io",
		Version:  "v1alpha1",
		Resource: "maasauthpolicies",
	}

	MaaSModelRefGvr = schema.GroupVersionResource{
		Group:    "maas.opendatahub.io",
		Version:  "v1alpha1",
		Resource: "maasmodelrefs",
	}

	GroupGvr = schema.GroupVersionResource{
		Group:    "user.openshift.io",
		Version:  "v1",
		Resource: "groups",
	}
)
