package webhook

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	admissionv1 "k8s.io/api/admission/v1"
	corev1 "k8s.io/api/core/v1"
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
func NewDashboardHandler(reader client.Reader, namespacedRBACWriters []string) *admission.Webhook {
	allowedWriters := make(map[string]struct{}, len(namespacedRBACWriters))
	for _, writer := range namespacedRBACWriters {
		if writer != "" {
			allowedWriters[writer] = struct{}{}
		}
	}

	return &admission.Webhook{
		Handler: admission.HandlerFunc(func(ctx context.Context, req admission.Request) admission.Response {
			if req.Resource == (metav1.GroupVersionResource{Group: "", Version: "v1", Resource: "namespaces"}) {
				return validateNamespacedRBACOptInWriter(req, allowedWriters)
			}
			if req.Resource != (metav1.GroupVersionResource{Group: DashboardGVK.Group, Version: DashboardGVK.Version, Resource: "dashboards"}) {
				return admission.Allowed("")
			}
			if singleton := platformwebhook.ValidateSingletonCreation(ctx, reader, &req, DashboardGVK); !singleton.Allowed {
				return singleton
			}
			return validateNamespacedRBACTargetWriter(req, allowedWriters)
		}),
	}
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

	if previousValue == current.Labels[v1alpha1.NamespacedRBACOptInLabel] {
		return admission.Allowed("")
	}
	if _, allowed := allowedWriters[req.UserInfo.Username]; allowed {
		return admission.Allowed("")
	}

	return admission.Denied(fmt.Sprintf(
		"user %q may not change namespace label %s; it is managed by the ODH orchestrator",
		req.UserInfo.Username,
		v1alpha1.NamespacedRBACOptInLabel,
	))
}

func validateNamespacedRBACTargetWriter(req admission.Request, allowedWriters map[string]struct{}) admission.Response {
	if req.SubResource != "" || (req.Operation != admissionv1.Create && req.Operation != admissionv1.Update) {
		return admission.Allowed("")
	}

	var current v1alpha1.Dashboard
	if err := json.Unmarshal(req.Object.Raw, &current); err != nil {
		return admission.Errored(http.StatusBadRequest, fmt.Errorf("decoding Dashboard: %w", err))
	}

	protectedFieldsChanged := current.Spec.NotebooksNamespace != "" || current.Spec.ModelRegistryNamespace != ""
	if req.Operation == admissionv1.Update {
		var previous v1alpha1.Dashboard
		if err := json.Unmarshal(req.OldObject.Raw, &previous); err != nil {
			return admission.Errored(http.StatusBadRequest, fmt.Errorf("decoding previous Dashboard: %w", err))
		}
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
