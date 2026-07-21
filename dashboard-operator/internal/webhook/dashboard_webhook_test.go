package webhook_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	admissionv1 "k8s.io/api/admission/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	dashwebhook "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/webhook"
)

func testScheme(t *testing.T) *runtime.Scheme {
	t.Helper()

	s := runtime.NewScheme()
	require.NoError(t, v1alpha1.AddToScheme(s))

	return s
}

func TestDashboardGVK(t *testing.T) {
	assert.Equal(t, "components.platform.opendatahub.io", dashwebhook.DashboardGVK.Group)
	assert.Equal(t, "v1alpha1", dashwebhook.DashboardGVK.Version)
	assert.Equal(t, "Dashboard", dashwebhook.DashboardGVK.Kind)
}

func TestSingletonHandler_AllowFirstCreate(t *testing.T) {
	cli := fake.NewClientBuilder().WithScheme(testScheme(t)).Build()

	handler := dashwebhook.NewSingletonHandler(cli)
	resp := handler.Handle(context.Background(), admission.Request{
		AdmissionRequest: admissionv1.AdmissionRequest{
			Operation: admissionv1.Create,
			Resource:  metav1.GroupVersionResource{Group: "components.platform.opendatahub.io", Version: "v1alpha1", Resource: "dashboards"},
		},
	})

	assert.True(t, resp.Allowed, "first CREATE should be allowed")
}

func TestSingletonHandler_WithExistingInstance(t *testing.T) {
	tests := []struct {
		name      string
		operation admissionv1.Operation
		wantAllow bool
	}{
		{name: "deny second create", operation: admissionv1.Create, wantAllow: false},
		{name: "allow update", operation: admissionv1.Update, wantAllow: true},
		{name: "allow delete", operation: admissionv1.Delete, wantAllow: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cli := fake.NewClientBuilder().
				WithScheme(testScheme(t)).
				WithObjects(&v1alpha1.Dashboard{
					ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
				}).
				Build()

			handler := dashwebhook.NewSingletonHandler(cli)
			resp := handler.Handle(context.Background(), admission.Request{
				AdmissionRequest: admissionv1.AdmissionRequest{
					Operation: tt.operation,
					Resource:  metav1.GroupVersionResource{Group: "components.platform.opendatahub.io", Version: "v1alpha1", Resource: "dashboards"},
				},
			})

			assert.Equal(t, tt.wantAllow, resp.Allowed)
		})
	}
}
