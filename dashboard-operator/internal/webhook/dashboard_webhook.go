package webhook

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	admissionv1 "k8s.io/api/admission/v1"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"

	platformwebhook "github.com/opendatahub-io/odh-platform-utilities/pkg/webhook"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

// DashboardGVK is the GroupVersionKind for the Dashboard resource.
var DashboardGVK = schema.GroupVersionKind{
	Group:   v1alpha1.GroupVersion.Group,
	Version: v1alpha1.GroupVersion.Version,
	Kind:    v1alpha1.DashboardKind,
}

// NewSingletonHandler returns an admission.Webhook that enforces the singleton
// constraint for Dashboard resources using the platform utilities library.
func NewSingletonHandler(reader client.Reader) *admission.Webhook {
	return &admission.Webhook{
		Handler: admission.HandlerFunc(func(ctx context.Context, req admission.Request) admission.Response {
			return platformwebhook.ValidateSingletonCreation(ctx, reader, &req, DashboardGVK)
		}),
	}
}

// NewDashboardHandler returns an admission webhook that enforces both the
// singleton constraint and orchestrator-only writes to cross-namespace RBAC
// target fields.
func NewDashboardHandler(
	reader client.Reader,
	namespacedRBACWriters []string,
	enforceNamespacedRBACConsent bool,
	controllerWriter string,
	operatorNamespace string,
) *admission.Webhook {
	allowedWriters := make(map[string]struct{}, len(namespacedRBACWriters))
	for _, writer := range namespacedRBACWriters {
		if writer != "" {
			allowedWriters[writer] = struct{}{}
		}
	}

	return &admission.Webhook{
		Handler: admission.HandlerFunc(func(ctx context.Context, req admission.Request) admission.Response {
			enforceConsent, err := namespacedRBACConsentEnforced(ctx, reader, enforceNamespacedRBACConsent, operatorNamespace)
			if err != nil {
				return admission.Errored(http.StatusInternalServerError, err)
			}
			if req.Resource == (metav1.GroupVersionResource{Group: "", Version: "v1", Resource: "namespaces"}) {
				if !enforceConsent {
					return admission.Allowed("")
				}
				return validateNamespacedRBACOptInWriter(req, allowedWriters)
			}
			if req.Resource != (metav1.GroupVersionResource{Group: DashboardGVK.Group, Version: DashboardGVK.Version, Resource: "dashboards"}) {
				return admission.Allowed("")
			}
			if singleton := platformwebhook.ValidateSingletonCreation(ctx, reader, &req, DashboardGVK); !singleton.Allowed {
				return singleton
			}
			return validateDashboardNamespacedRBACWrite(
				req,
				allowedWriters,
				enforceConsent,
				controllerWriter,
			)
		}),
	}
}

func namespacedRBACConsentEnforced(
	ctx context.Context,
	reader client.Reader,
	configured bool,
	operatorNamespace string,
) (bool, error) {
	if configured {
		return true, nil
	}

	state := &corev1.ConfigMap{}
	if err := reader.Get(ctx, client.ObjectKey{
		Namespace: operatorNamespace,
		Name:      v1alpha1.NamespacedRBACStateConfigMapName,
	}, state); err == nil {
		if state.Data[v1alpha1.NamespacedRBACConsentEnforcedKey] == "true" {
			return true, nil
		}
	} else if !k8serrors.IsNotFound(err) {
		return false, fmt.Errorf("reading namespaced RBAC controller state: %w", err)
	}

	// Backward-compatible migration path for clusters that persisted the latch
	// on the Dashboard before controller-protected state was introduced.
	dashboard := &v1alpha1.Dashboard{}
	if err := reader.Get(ctx, client.ObjectKey{Name: v1alpha1.DashboardInstanceName}, dashboard); err != nil {
		if k8serrors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("reading namespaced RBAC consent enforcement state: %w", err)
	}
	return dashboard.Annotations[v1alpha1.NamespacedRBACConsentEnforcedAnnotation] == "true", nil
}

func validateNamespacedRBACOptInWriter(req admission.Request, allowedWriters map[string]struct{}) admission.Response {
	if req.Operation != admissionv1.Create && req.Operation != admissionv1.Update {
		return admission.Allowed("")
	}

	var current corev1.Namespace
	if err := json.Unmarshal(req.Object.Raw, &current); err != nil {
		return admission.Errored(http.StatusBadRequest, fmt.Errorf("decoding Namespace: %w", err))
	}

	previousValue := ""
	if req.Operation == admissionv1.Update {
		var previous corev1.Namespace
		if err := json.Unmarshal(req.OldObject.Raw, &previous); err != nil {
			return admission.Errored(http.StatusBadRequest, fmt.Errorf("decoding previous Namespace: %w", err))
		}
		previousValue = previous.Labels[v1alpha1.NamespacedRBACOptInLabel]
	}

	currentValue := current.Labels[v1alpha1.NamespacedRBACOptInLabel]
	if previousValue == currentValue {
		return admission.Allowed("")
	}
	// Revocation is always safe: anyone already authorized by Kubernetes to
	// update the Namespace may remove consent. Only granting consent is reserved
	// for the trusted platform writers.
	if currentValue != "true" {
		return admission.Allowed("namespaced RBAC consent revoked")
	}
	if _, allowed := allowedWriters[req.UserInfo.Username]; allowed {
		return admission.Allowed("")
	}

	return admission.Denied(fmt.Sprintf(
		"user %q may not grant namespace consent with label %s; it is managed by the ODH orchestrator",
		req.UserInfo.Username,
		v1alpha1.NamespacedRBACOptInLabel,
	))
}

func validateDashboardNamespacedRBACWrite(
	req admission.Request,
	allowedWriters map[string]struct{},
	enforceNamespacedRBACConsent bool,
	controllerWriter string,
) admission.Response {
	if req.SubResource != "" || (req.Operation != admissionv1.Create && req.Operation != admissionv1.Update) {
		return admission.Allowed("")
	}

	var current v1alpha1.Dashboard
	if err := json.Unmarshal(req.Object.Raw, &current); err != nil {
		return admission.Errored(http.StatusBadRequest, fmt.Errorf("decoding Dashboard: %w", err))
	}

	var previous v1alpha1.Dashboard
	if req.Operation == admissionv1.Update {
		if err := json.Unmarshal(req.OldObject.Raw, &previous); err != nil {
			return admission.Errored(http.StatusBadRequest, fmt.Errorf("decoding previous Dashboard: %w", err))
		}
	}

	if protectedNamespacedRBACAnnotationChanged(&previous, &current) && req.UserInfo.Username != controllerWriter {
		return admission.Denied(fmt.Sprintf(
			"user %q may not change controller-owned namespaced RBAC annotations",
			req.UserInfo.Username,
		))
	}
	if !enforceNamespacedRBACConsent {
		return admission.Allowed("")
	}

	protectedFieldsChanged := current.Spec.NotebooksNamespace != "" || current.Spec.ModelRegistryNamespace != ""
	if req.Operation == admissionv1.Update {
		protectedFieldsChanged = previous.Spec.NotebooksNamespace != current.Spec.NotebooksNamespace ||
			previous.Spec.ModelRegistryNamespace != current.Spec.ModelRegistryNamespace
	}

	if !protectedFieldsChanged {
		return admission.Allowed("")
	}
	if _, allowed := allowedWriters[req.UserInfo.Username]; allowed {
		return admission.Allowed("")
	}

	return admission.Denied(fmt.Sprintf(
		"user %q may not set spec.notebooksNamespace or spec.modelRegistryNamespace; these fields are managed by the ODH orchestrator",
		req.UserInfo.Username,
	))
}

func protectedNamespacedRBACAnnotationChanged(previous, current *v1alpha1.Dashboard) bool {
	for _, key := range []string{
		v1alpha1.NamespacedRBACInventoryAnnotation,
		v1alpha1.NamespacedRBACConsentEnforcedAnnotation,
	} {
		if previous.Annotations[key] != current.Annotations[key] {
			return true
		}
	}
	return false
}
