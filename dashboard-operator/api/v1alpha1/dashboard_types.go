package v1alpha1

import (
	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	DashboardComponentName = "dashboard"
	DashboardInstanceName  = "default-dashboard"
	DashboardKind          = "Dashboard"
)

// GatewaySpec defines gateway configuration for the dashboard.
// This is defined locally because it is not yet part of odh-platform-utilities.
type GatewaySpec struct {
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MaxLength=253
	// +kubebuilder:validation:Pattern=`^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$`
	Domain string `json:"domain"`
}

// DashboardCommonSpec defines the desired state shared between DSC and standalone Dashboard.
type DashboardCommonSpec struct{}

// DashboardCommonStatus defines the observed state shared between DSC and standalone Dashboard.
type DashboardCommonStatus struct {
	URL string `json:"url,omitempty"`
}

// DashboardSpec defines the desired state of Dashboard.
type DashboardSpec struct {
	DashboardCommonSpec `json:",inline"`

	// +optional
	Gateway *GatewaySpec `json:"gateway,omitempty"`
}

// DashboardStatus defines the observed state of Dashboard.
type DashboardStatus struct {
	common.Status                 `json:",inline"`
	DashboardCommonStatus         `json:",inline"`
	common.ComponentReleaseStatus `json:",inline"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:printcolumn:name="Ready",type=string,JSONPath=`.status.conditions[?(@.type=="Ready")].status`
// +kubebuilder:printcolumn:name="Reason",type=string,JSONPath=`.status.conditions[?(@.type=="Ready")].reason`
// +kubebuilder:printcolumn:name="URL",type=string,JSONPath=`.status.url`
// +kubebuilder:validation:XValidation:rule="self.metadata.name == 'default-dashboard'",message="Dashboard name must be default-dashboard"

// Dashboard is the Schema for the dashboards API.
type Dashboard struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   DashboardSpec   `json:"spec,omitempty"`
	Status DashboardStatus `json:"status,omitempty"`
}

func (d *Dashboard) GetStatus() *common.Status {
	return &d.Status.Status
}

func (d *Dashboard) GetConditions() []common.Condition {
	return d.Status.Conditions
}

func (d *Dashboard) SetConditions(conditions []common.Condition) {
	d.Status.Conditions = conditions
}

func (d *Dashboard) GetReleaseStatus() *common.ComponentReleaseStatus {
	return &d.Status.ComponentReleaseStatus
}

func (d *Dashboard) SetReleaseStatus(status common.ComponentReleaseStatus) {
	d.Status.ComponentReleaseStatus = status
}

// +kubebuilder:object:root=true

// DashboardList contains a list of Dashboard.
type DashboardList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Dashboard `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Dashboard{}, &DashboardList{})
}
