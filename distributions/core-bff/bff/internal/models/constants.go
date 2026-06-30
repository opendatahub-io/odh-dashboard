package models

import "k8s.io/apimachinery/pkg/runtime/schema"

const (
	LabelDashboardResource = "opendatahub.io/dashboard"
	LabelConnectionType    = "opendatahub.io/connection-type"
)

// AuthGVR is the GroupVersionResource for the Auth CRD.
var AuthGVR = schema.GroupVersionResource{
	Group:    "services.platform.opendatahub.io",
	Version:  "v1alpha1",
	Resource: "auths",
}

// NotebookGVR is the GroupVersionResource for Kubeflow Notebook CRDs.
var NotebookGVR = schema.GroupVersionResource{
	Group:    "kubeflow.org",
	Version:  "v1",
	Resource: "notebooks",
}

// OdhApplicationGVR is the GroupVersionResource for OdhApplication CRDs.
var OdhApplicationGVR = schema.GroupVersionResource{
	Group:    "dashboard.opendatahub.io",
	Version:  "v1",
	Resource: "odhapplications",
}
