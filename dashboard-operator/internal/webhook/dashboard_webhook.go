package webhook

import (
	"context"

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
