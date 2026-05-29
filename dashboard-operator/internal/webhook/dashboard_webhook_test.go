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
	assert.Equal(t, "dashboard.opendatahub.io", dashwebhook.DashboardGVK.Group)
	assert.Equal(t, "v1alpha1", dashwebhook.DashboardGVK.Version)
	assert.Equal(t, "Dashboard", dashwebhook.DashboardGVK.Kind)
}

func TestSingletonHandler_AllowFirstCreate(t *testing.T) {
	s := testScheme(t)
	cli := fake.NewClientBuilder().WithScheme(s).Build()

	handler := dashwebhook.NewSingletonHandler(cli)
	resp := handler.Handle(context.Background(), admission.Request{
		AdmissionRequest: admissionv1.AdmissionRequest{
			Operation: admissionv1.Create,
			Resource:  metav1.GroupVersionResource{Group: "dashboard.opendatahub.io", Version: "v1alpha1", Resource: "dashboards"},
		},
	})

	assert.True(t, resp.Allowed, "first CREATE should be allowed")
}

func TestSingletonHandler_DenySecondCreate(t *testing.T) {
	s := testScheme(t)

	existing := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
	}

	cli := fake.NewClientBuilder().
		WithScheme(s).
		WithObjects(existing).
		Build()

	handler := dashwebhook.NewSingletonHandler(cli)
	resp := handler.Handle(context.Background(), admission.Request{
		AdmissionRequest: admissionv1.AdmissionRequest{
			Operation: admissionv1.Create,
			Resource:  metav1.GroupVersionResource{Group: "dashboard.opendatahub.io", Version: "v1alpha1", Resource: "dashboards"},
		},
	})

	assert.False(t, resp.Allowed, "second CREATE should be denied")
	assert.Contains(t, resp.Result.Message, "only one instance")
}

func TestSingletonHandler_AllowUpdate(t *testing.T) {
	s := testScheme(t)

	existing := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
	}

	cli := fake.NewClientBuilder().
		WithScheme(s).
		WithObjects(existing).
		Build()

	handler := dashwebhook.NewSingletonHandler(cli)
	resp := handler.Handle(context.Background(), admission.Request{
		AdmissionRequest: admissionv1.AdmissionRequest{
			Operation: admissionv1.Update,
		},
	})

	assert.True(t, resp.Allowed, "UPDATE should always be allowed")
}

func TestSingletonHandler_AllowDelete(t *testing.T) {
	s := testScheme(t)

	existing := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
	}

	cli := fake.NewClientBuilder().
		WithScheme(s).
		WithObjects(existing).
		Build()

	handler := dashwebhook.NewSingletonHandler(cli)
	resp := handler.Handle(context.Background(), admission.Request{
		AdmissionRequest: admissionv1.AdmissionRequest{
			Operation: admissionv1.Delete,
		},
	})

	assert.True(t, resp.Allowed, "DELETE should always be allowed")
}
