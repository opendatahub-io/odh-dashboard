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

// ModuleOverrideState is a tri-state enum for module enablement overrides.
// Absent/empty defers to automatic dependency-based resolution.
type ModuleOverrideState string

const (
	ModuleEnabled  ModuleOverrideState = "Enabled"
	ModuleDisabled ModuleOverrideState = "Disabled"
)

// ModulePhase represents the deployment lifecycle of an individual module.
type ModulePhase string

const (
	ModulePhaseDeployed    ModulePhase = "Deployed"
	ModulePhaseNotDeployed ModulePhase = "NotDeployed"
	ModulePhaseDegraded    ModulePhase = "Degraded"
	ModulePhaseDisabled    ModulePhase = "Disabled"
)

// GatewaySpec defines gateway configuration for the dashboard.
// On OpenShift this translates to a Route; on vanilla Kubernetes it
// configures an Ingress resource with the specified domain.
type GatewaySpec struct {
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MaxLength=253
	// +kubebuilder:validation:Pattern=`^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$`
	Domain string `json:"domain"`
}

// ComponentAvailability represents a DSC component's availability state
// as projected by the orchestrator.
type ComponentAvailability struct {
	// ManagementState is the DSC component's management state.
	// "Managed" or "Unmanaged" means the component is available;
	// "Removed" means it is not.
	//
	// +kubebuilder:validation:Enum=Managed;Unmanaged;Removed
	// +kubebuilder:default=Removed
	ManagementState string `json:"managementState"`
}

// ModuleOverride allows the orchestrator or admin to override the
// automatic dependency-based module enablement decision.
type ModuleOverride struct {
	// State overrides automatic module enablement.
	// If empty or omitted, the controller uses dependency resolution.
	//
	// +kubebuilder:validation:Enum=Enabled;Disabled
	// +optional
	State ModuleOverrideState `json:"state,omitempty"`
}

// ObservabilitySpec configures the Perses observability proxy.
type ObservabilitySpec struct {
	// Enabled controls whether the Perses proxy module is deployed.
	//
	// +kubebuilder:default=false
	// +optional
	Enabled bool `json:"enabled,omitempty"`

	// PersesService identifies the target Perses service to proxy to.
	// Required when Enabled is true.
	//
	// +optional
	PersesService *ServiceTarget `json:"persesService,omitempty"`
}

// ServiceTarget identifies a Kubernetes service for proxy configuration.
type ServiceTarget struct {
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MinLength=1
	Name string `json:"name"`

	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MinLength=1
	Namespace string `json:"namespace"`

	// +kubebuilder:validation:Minimum=1
	// +kubebuilder:validation:Maximum=65535
	// +kubebuilder:default=8080
	Port int32 `json:"port,omitempty"`
}

// ModuleStatus reports the current state of a single module.
type ModuleStatus struct {
	// +kubebuilder:validation:Enum=Deployed;NotDeployed;Degraded;Disabled
	Phase ModulePhase `json:"phase"`

	// Reason is a one-word CamelCase explanation for the current phase.
	// +optional
	Reason string `json:"reason,omitempty"`

	// +optional
	Message string `json:"message,omitempty"`

	// +optional
	LastTransitionTime metav1.Time `json:"lastTransitionTime,omitempty"`
}

// DashboardSpec defines the desired state of the Dashboard module.
type DashboardSpec struct {
	// ManagementSpec carries the orchestrator's intent: Managed or Removed.
	// +optional
	common.ManagementSpec `json:",inline"`

	// Gateway configures the ingress point for the dashboard.
	// +optional
	Gateway *GatewaySpec `json:"gateway,omitempty"`

	// Components is a snapshot of DSC component availability, projected by
	// the ODH Operator onto this CR.
	// +optional
	Components map[string]ComponentAvailability `json:"components,omitempty"`

	// Modules contains per-module override configuration. Map keys are
	// module names as defined in the controller's internal module registry.
	// +optional
	Modules map[string]ModuleOverride `json:"modules,omitempty"`

	// Observability configures the observability stack integration.
	// +optional
	Observability *ObservabilitySpec `json:"observability,omitempty"`
}

// DashboardStatus defines the observed state of the Dashboard.
type DashboardStatus struct {
	common.Status                 `json:",inline"`
	common.ComponentReleaseStatus `json:",inline"`

	// URL is the externally-reachable dashboard URL (last known good).
	// This value persists across transient route failures — consumers must
	// check the Ready condition before relying on this endpoint.
	// +optional
	URL string `json:"url,omitempty"`

	// ModuleStatuses reports the deployment state of each module.
	// +optional
	ModuleStatuses map[string]ModuleStatus `json:"moduleStatuses,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:printcolumn:name="Management",type=string,JSONPath=`.spec.managementState`,priority=1
// +kubebuilder:printcolumn:name="Phase",type=string,JSONPath=`.status.phase`
// +kubebuilder:printcolumn:name="Ready",type=string,JSONPath=`.status.conditions[?(@.type=="Ready")].status`
// +kubebuilder:printcolumn:name="Reason",type=string,JSONPath=`.status.conditions[?(@.type=="Ready")].reason`
// +kubebuilder:printcolumn:name="URL",type=string,JSONPath=`.status.url`
// +kubebuilder:printcolumn:name="Age",type="date",JSONPath=".metadata.creationTimestamp"
// +kubebuilder:validation:XValidation:rule="self.metadata.name == 'default-dashboard'",message="Dashboard name must be default-dashboard"
// +kubebuilder:validation:XValidation:rule="!has(self.spec.observability) || !self.spec.observability.enabled || has(self.spec.observability.persesService)",message="persesService must be specified when observability is enabled"

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
