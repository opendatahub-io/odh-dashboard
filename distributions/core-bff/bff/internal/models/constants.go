package models

import "k8s.io/apimachinery/pkg/runtime/schema"

const (
	LabelDashboardResource = "opendatahub.io/dashboard"
	LabelConnectionType    = "opendatahub.io/connection-type"

	PrivilegeAdmin = "Admin"
	PrivilegeUser  = "User"

	// SystemAuthenticated is the K8s group that includes all authenticated users.
	// Used in Auth CR allowedGroups to grant dashboard access to every authenticated identity.
	SystemAuthenticated = "system:authenticated"

	// AuthInstanceName is the CR instance name for the Auth singleton.
	AuthInstanceName = "auth"

	// DefaultAuthName is the SSAR resource name used for admin/allowed checks.
	DefaultAuthName = "default-auth"
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

// ClusterVersionGVR is the GroupVersionResource for OpenShift ClusterVersion.
var ClusterVersionGVR = schema.GroupVersionResource{
	Group:    "config.openshift.io",
	Version:  "v1",
	Resource: "clusterversions",
}

// OpenShiftUserGVR is the GroupVersionResource for OpenShift User.
var OpenShiftUserGVR = schema.GroupVersionResource{
	Group:    "user.openshift.io",
	Version:  "v1",
	Resource: "users",
}
