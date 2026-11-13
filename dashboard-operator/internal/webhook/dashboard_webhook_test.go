package webhook_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	admissionv1 "k8s.io/api/admission/v1"
	authenticationv1 "k8s.io/api/authentication/v1"
	corev1 "k8s.io/api/core/v1"
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
	require.NoError(t, corev1.AddToScheme(s))
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
		name            string
		operation       admissionv1.Operation
		wantAllow       bool
		wantCode        int32
		wantMessagePart string
	}{
		{
			name:            "deny second create",
			operation:       admissionv1.Create,
			wantAllow:       false,
			wantCode:        403,
			wantMessagePart: "only one instance of Dashboard is allowed; an instance already exists",
		},
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
			if tt.wantMessagePart != "" {
				require.NotNil(t, resp.Result)
				assert.Equal(t, tt.wantCode, resp.Result.Code)
				assert.Contains(t, resp.Result.Message, tt.wantMessagePart)
			}
		})
	}
}

func dashboardRaw(t *testing.T, notebooksNamespace, modelRegistryNamespace string) []byte {
	t.Helper()
	raw, err := json.Marshal(&v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
		Spec: v1alpha1.DashboardSpec{
			NotebooksNamespace:     notebooksNamespace,
			ModelRegistryNamespace: modelRegistryNamespace,
		},
	})
	require.NoError(t, err)
	return raw
}

func TestDashboardHandler_ProtectsNamespacedRBACTargetFields(t *testing.T) {
	const orchestrator = "system:serviceaccount:redhat-ods-operator:redhat-ods-operator-controller-manager"
	handler := dashwebhook.NewDashboardHandler(
		fake.NewClientBuilder().WithScheme(testScheme(t)).Build(),
		[]string{orchestrator},
	)

	tests := []struct {
		name      string
		operation admissionv1.Operation
		username  string
		oldRaw    []byte
		newRaw    []byte
		allowed   bool
	}{
		{
			name:      "allow unprivileged create without protected fields",
			operation: admissionv1.Create,
			username:  "alice",
			newRaw:    dashboardRaw(t, "", ""),
			allowed:   true,
		},
		{
			name:      "deny unprivileged create with protected field",
			operation: admissionv1.Create,
			username:  "alice",
			newRaw:    dashboardRaw(t, "arbitrary", ""),
		},
		{
			name:      "deny unprivileged create with model registry namespace",
			operation: admissionv1.Create,
			username:  "alice",
			newRaw:    dashboardRaw(t, "", "arbitrary"),
		},
		{
			name:      "allow orchestrator create with protected field",
			operation: admissionv1.Create,
			username:  orchestrator,
			newRaw:    dashboardRaw(t, "rhods-notebooks", ""),
			allowed:   true,
		},
		{
			name:      "deny unprivileged protected field update",
			operation: admissionv1.Update,
			username:  "alice",
			oldRaw:    dashboardRaw(t, "rhods-notebooks", ""),
			newRaw:    dashboardRaw(t, "arbitrary", ""),
		},
		{
			name:      "deny unprivileged protected field removal",
			operation: admissionv1.Update,
			username:  "alice",
			oldRaw:    dashboardRaw(t, "rhods-notebooks", ""),
			newRaw:    dashboardRaw(t, "", ""),
		},
		{
			name:      "deny unprivileged model registry namespace update",
			operation: admissionv1.Update,
			username:  "alice",
			oldRaw:    dashboardRaw(t, "", "rhoai-model-registries"),
			newRaw:    dashboardRaw(t, "", "arbitrary"),
		},
		{
			name:      "deny unprivileged model registry namespace removal",
			operation: admissionv1.Update,
			username:  "alice",
			oldRaw:    dashboardRaw(t, "", "rhoai-model-registries"),
			newRaw:    dashboardRaw(t, "", ""),
		},
		{
			name:      "allow orchestrator protected field update",
			operation: admissionv1.Update,
			username:  orchestrator,
			oldRaw:    dashboardRaw(t, "rhods-notebooks", ""),
			newRaw:    dashboardRaw(t, "custom-notebooks", "rhoai-model-registries"),
			allowed:   true,
		},
		{
			name:      "allow unprivileged update when protected fields are unchanged",
			operation: admissionv1.Update,
			username:  "alice",
			oldRaw:    dashboardRaw(t, "rhods-notebooks", "rhoai-model-registries"),
			newRaw:    dashboardRaw(t, "rhods-notebooks", "rhoai-model-registries"),
			allowed:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := handler.Handle(context.Background(), admission.Request{
				AdmissionRequest: admissionv1.AdmissionRequest{
					Operation: tt.operation,
					Resource:  metav1.GroupVersionResource{Group: "components.platform.opendatahub.io", Version: "v1alpha1", Resource: "dashboards"},
					UserInfo:  authenticationv1.UserInfo{Username: tt.username},
					Object:    runtime.RawExtension{Raw: tt.newRaw},
					OldObject: runtime.RawExtension{Raw: tt.oldRaw},
				},
			})

			assert.Equal(t, tt.allowed, resp.Allowed)
			if !tt.allowed {
				require.NotNil(t, resp.Result)
				assert.Contains(t, resp.Result.Message, "managed by the ODH orchestrator")
			}
		})
	}
}

func TestDashboardHandler_EmptyWriterListFailsClosed(t *testing.T) {
	handler := dashwebhook.NewDashboardHandler(
		fake.NewClientBuilder().WithScheme(testScheme(t)).Build(),
		nil,
	)

	resp := handler.Handle(context.Background(), admission.Request{
		AdmissionRequest: admissionv1.AdmissionRequest{
			Operation: admissionv1.Update,
			Resource:  metav1.GroupVersionResource{Group: "components.platform.opendatahub.io", Version: "v1alpha1", Resource: "dashboards"},
			UserInfo:  authenticationv1.UserInfo{Username: "system:serviceaccount:redhat-ods-operator:redhat-ods-operator-controller-manager"},
			Object:    runtime.RawExtension{Raw: dashboardRaw(t, "rhods-notebooks", "")},
			OldObject: runtime.RawExtension{Raw: dashboardRaw(t, "", "")},
		},
	})

	assert.False(t, resp.Allowed)
	require.NotNil(t, resp.Result)
	assert.Contains(t, resp.Result.Message, "managed by the ODH orchestrator")
}

func namespaceRaw(t *testing.T, labels map[string]string) []byte {
	t.Helper()
	raw, err := json.Marshal(&corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{Name: "target", Labels: labels},
	})
	require.NoError(t, err)
	return raw
}

func TestDashboardHandler_ProtectsNamespaceOptInLabel(t *testing.T) {
	const orchestrator = "system:serviceaccount:redhat-ods-operator:redhat-ods-operator-controller-manager"
	handler := dashwebhook.NewDashboardHandler(
		fake.NewClientBuilder().WithScheme(testScheme(t)).Build(),
		[]string{orchestrator},
	)

	for _, tt := range []struct {
		name        string
		operation   admissionv1.Operation
		subresource string
		username    string
		oldRaw      []byte
		newRaw      []byte
		allowed     bool
	}{
		{
			name:      "allow untrusted namespace create without consent",
			operation: admissionv1.Create,
			username:  "alice",
			newRaw:    namespaceRaw(t, map[string]string{"other": "value"}),
			allowed:   true,
		},
		{
			name:      "deny untrusted namespace create with consent",
			operation: admissionv1.Create,
			username:  "alice",
			newRaw:    namespaceRaw(t, map[string]string{v1alpha1.NamespacedRBACOptInLabel: "true"}),
		},
		{
			name:      "allow orchestrator namespace create with consent",
			operation: admissionv1.Create,
			username:  orchestrator,
			newRaw:    namespaceRaw(t, map[string]string{v1alpha1.NamespacedRBACOptInLabel: "true"}),
			allowed:   true,
		},
		{
			name:      "deny dashboard service account adding consent",
			operation: admissionv1.Update,
			username:  "system:serviceaccount:redhat-ods-applications:rhods-dashboard",
			oldRaw:    namespaceRaw(t, nil),
			newRaw:    namespaceRaw(t, map[string]string{v1alpha1.NamespacedRBACOptInLabel: "true"}),
		},
		{
			name:      "deny untrusted writer removing consent",
			operation: admissionv1.Update,
			username:  "alice",
			oldRaw:    namespaceRaw(t, map[string]string{v1alpha1.NamespacedRBACOptInLabel: "true"}),
			newRaw:    namespaceRaw(t, nil),
		},
		{
			name:      "allow orchestrator changing consent",
			operation: admissionv1.Update,
			username:  orchestrator,
			oldRaw:    namespaceRaw(t, nil),
			newRaw:    namespaceRaw(t, map[string]string{v1alpha1.NamespacedRBACOptInLabel: "true"}),
			allowed:   true,
		},
		{
			name:      "allow unrelated namespace label update",
			operation: admissionv1.Update,
			username:  "alice",
			oldRaw:    namespaceRaw(t, map[string]string{v1alpha1.NamespacedRBACOptInLabel: "true", "other": "old"}),
			newRaw:    namespaceRaw(t, map[string]string{v1alpha1.NamespacedRBACOptInLabel: "true", "other": "new"}),
			allowed:   true,
		},
		{
			name:        "deny consent change through namespace subresource",
			operation:   admissionv1.Update,
			subresource: "status",
			username:    "alice",
			oldRaw:      namespaceRaw(t, nil),
			newRaw:      namespaceRaw(t, map[string]string{v1alpha1.NamespacedRBACOptInLabel: "true"}),
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			resp := handler.Handle(context.Background(), admission.Request{
				AdmissionRequest: admissionv1.AdmissionRequest{
					Operation:   tt.operation,
					Resource:    metav1.GroupVersionResource{Version: "v1", Resource: "namespaces"},
					SubResource: tt.subresource,
					UserInfo:    authenticationv1.UserInfo{Username: tt.username},
					Object:      runtime.RawExtension{Raw: tt.newRaw},
					OldObject:   runtime.RawExtension{Raw: tt.oldRaw},
				},
			})

			assert.Equal(t, tt.allowed, resp.Allowed)
			if !tt.allowed {
				require.NotNil(t, resp.Result)
				assert.Contains(t, resp.Result.Message, v1alpha1.NamespacedRBACOptInLabel)
			}
		})
	}
}
