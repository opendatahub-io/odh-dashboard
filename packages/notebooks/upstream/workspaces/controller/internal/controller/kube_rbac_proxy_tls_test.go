/*
Copyright 2024.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controller

import (
	"context"
	"errors"
	"reflect"
	"slices"
	"strings"
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/api/equality"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
	gatewayv1beta1 "sigs.k8s.io/gateway-api/apis/v1beta1"

	kubefloworgv1beta1 "github.com/kubeflow/notebooks/workspaces/controller/api/v1beta1"
	"github.com/kubeflow/notebooks/workspaces/controller/internal/config"
	"github.com/kubeflow/notebooks/workspaces/controller/internal/helper"
	pkgtls "github.com/kubeflow/notebooks/workspaces/controller/pkg/tls"
)

func TestKubeRBACProxySidecarArgs(t *testing.T) {
	fallback, err := pkgtls.ResolveProxyTLS(context.Background(), emptyAPIReader(), false)
	if err != nil {
		t.Fatal(err)
	}
	assertRenderedProxyArgs(t, fallback, []string{
		"--tls-min-version=VersionTLS12",
		"--tls-cipher-suites=" + strings.Join(fallback.Ciphers, ","),
	})

	custom, err := pkgtls.ResolveProxyTLS(context.Background(), apiReaderWith(strictCustomAPIServer()), false)
	if err != nil {
		t.Fatal(err)
	}
	assertRenderedProxyArgs(t, custom, []string{
		"--tls-min-version=VersionTLS12",
		"--tls-cipher-suites=TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256",
		"--tls-curve-preferences=25,29,23",
	})

	tls13, err := pkgtls.ResolveProxyTLS(context.Background(), apiReaderWith(tls13APIServer()), false)
	if err != nil {
		t.Fatal(err)
	}
	assertRenderedProxyArgs(t, tls13, []string{
		"--tls-min-version=VersionTLS13",
		"--tls-curve-preferences=24",
	})
	for _, arg := range renderProxyArgs(t, tls13) {
		if len(arg) >= len("--tls-cipher-suites") && arg[:len("--tls-cipher-suites")] == "--tls-cipher-suites" {
			t.Fatalf("TLS 1.3 sidecar args include a cipher flag: %s", arg)
		}
	}
}

func TestInvalidStrictProfileLeavesStatefulSetUnchanged(t *testing.T) {
	fixture := newGatewayFixture(t, emptyAPIReader())
	req := exampleReconcileRequest()
	if _, err := fixture.Reconcile(context.Background(), req); err != nil {
		t.Fatalf("initial reconcile: %v", err)
	}
	before := fixture.statefulSet(t)

	fixture.APIReader = apiReaderWith(apiServerProfile(map[string]any{"type": "Old"}, "StrictAllComponents"))
	_, err := fixture.Reconcile(context.Background(), req)
	if !errors.Is(err, pkgtls.ErrProxyTLSUnusable) {
		t.Fatalf("reconcile error = %v", err)
	}
	after := fixture.statefulSet(t)
	if after.ResourceVersion != before.ResourceVersion {
		t.Fatalf("resourceVersion changed from %s to %s", before.ResourceVersion, after.ResourceVersion)
	}
	if !equality.Semantic.DeepEqual(before.Spec.Template, after.Spec.Template) {
		t.Fatal("pod template changed after an unusable strict profile")
	}
	status := workspaceOf(t, fixture).Status
	if status.State != kubefloworgv1beta1.WorkspaceStateError {
		t.Fatalf("status.state = %s, want Error", status.State)
	}
	if !strings.Contains(status.StateMessage, "kube-rbac-proxy") {
		t.Fatalf("status.stateMessage = %q", status.StateMessage)
	}
}

func TestUnusableProfileStillPausesWorkspace(t *testing.T) {
	fixture := newGatewayFixture(t, emptyAPIReader())
	req := exampleReconcileRequest()
	if _, err := fixture.Reconcile(context.Background(), req); err != nil {
		t.Fatalf("initial reconcile: %v", err)
	}
	before := fixture.statefulSet(t)
	if before.Spec.Replicas == nil || *before.Spec.Replicas != 1 {
		t.Fatalf("replicas = %v", before.Spec.Replicas)
	}

	workspace := workspaceOf(t, fixture)
	workspace.Spec.Paused = true
	if err := fixture.Update(context.Background(), workspace); err != nil {
		t.Fatal(err)
	}
	fixture.APIReader = apiReaderWith(apiServerProfile(map[string]any{"type": "Old"}, "StrictAllComponents"))
	_, err := fixture.Reconcile(context.Background(), req)
	if !errors.Is(err, pkgtls.ErrProxyTLSUnusable) {
		t.Fatalf("reconcile error = %v", err)
	}

	after := fixture.statefulSet(t)
	if after.Spec.Replicas == nil || *after.Spec.Replicas != 0 {
		t.Fatalf("replicas = %v, want 0", after.Spec.Replicas)
	}
	if !equality.Semantic.DeepEqual(before.Spec.Template, after.Spec.Template) {
		t.Fatal("pod template changed while scaling a paused Workspace")
	}
	if workspaceOf(t, fixture).Status.State != kubefloworgv1beta1.WorkspaceStateError {
		t.Fatalf("status.state = %s, want Error", workspaceOf(t, fixture).Status.State)
	}
}

func TestUnusableProfileDoesNotCreateStatefulSet(t *testing.T) {
	fixture := newGatewayFixture(t, apiReaderWith(apiServerProfile(map[string]any{"type": "Old"}, "StrictAllComponents")))
	_, err := fixture.Reconcile(context.Background(), exampleReconcileRequest())
	if !errors.Is(err, pkgtls.ErrProxyTLSUnusable) {
		t.Fatalf("reconcile error = %v", err)
	}
	list := &appsv1.StatefulSetList{}
	if err := fixture.List(context.Background(), list, client.InNamespace("workspaces")); err != nil {
		t.Fatal(err)
	}
	if len(list.Items) != 0 {
		t.Fatalf("StatefulSet count = %d, want 0", len(list.Items))
	}
	if workspaceOf(t, fixture).Status.State != kubefloworgv1beta1.WorkspaceStateError {
		t.Fatalf("status.state = %s, want Error", workspaceOf(t, fixture).Status.State)
	}
}

func TestUnusableProfileDoesNotBlockWorkspaceWithoutHTTPPort(t *testing.T) {
	fixture := newGatewayFixture(t, apiReaderWith(apiServerProfile(map[string]any{"type": "Old"}, "StrictAllComponents")))
	kind := &kubefloworgv1beta1.WorkspaceKind{}
	if err := fixture.Get(context.Background(), types.NamespacedName{Name: "jupyterlab"}, kind); err != nil {
		t.Fatal(err)
	}
	for i := range kind.Spec.PodTemplate.Ports {
		kind.Spec.PodTemplate.Ports[i].Protocol = "TCP"
	}
	if err := fixture.Update(context.Background(), kind); err != nil {
		t.Fatal(err)
	}

	if _, err := fixture.Reconcile(context.Background(), exampleReconcileRequest()); err != nil {
		t.Fatalf("reconcile: %v", err)
	}
	for _, container := range fixture.statefulSet(t).Spec.Template.Spec.Containers {
		if container.Name == workspaceKubeRbacProxyServicePortName {
			t.Fatal("kube-rbac-proxy sidecar was added without an HTTP port")
		}
	}
}

func TestProfileAdherenceChangeRollsStatefulSet(t *testing.T) {
	modern := map[string]any{"type": "Modern"}
	fixture := newGatewayFixture(t, apiReaderWith(apiServerProfile(modern, "LegacyAdheringComponentsOnly")))
	req := exampleReconcileRequest()
	if _, err := fixture.Reconcile(context.Background(), req); err != nil {
		t.Fatalf("legacy reconcile: %v", err)
	}
	legacy := fixture.statefulSet(t)
	legacyArgs := proxyContainerArgs(t, legacy)
	if !containsArg(legacyArgs, "--tls-min-version=VersionTLS12") || containsArgPrefix(legacyArgs, "--tls-curve-preferences=") {
		t.Fatalf("legacy args = %v", legacyArgs)
	}

	fixture.APIReader = apiReaderWith(apiServerProfile(modern, "StrictAllComponents"))
	if _, err := fixture.Reconcile(context.Background(), req); err != nil {
		t.Fatalf("strict reconcile: %v", err)
	}
	strict := fixture.statefulSet(t)
	strictArgs := proxyContainerArgs(t, strict)
	if strict.ResourceVersion == legacy.ResourceVersion {
		t.Fatal("adherence change did not update the StatefulSet")
	}
	if equality.Semantic.DeepEqual(legacy.Spec.Template, strict.Spec.Template) {
		t.Fatal("adherence change left the pod template unchanged")
	}
	if !containsArg(strictArgs, "--tls-min-version=VersionTLS13") || !containsArgPrefix(strictArgs, "--tls-curve-preferences=") {
		t.Fatalf("strict Modern args = %v", strictArgs)
	}
	if containsArgPrefix(strictArgs, "--tls-cipher-suites=") {
		t.Fatalf("TLS 1.3 args include a cipher flag: %v", strictArgs)
	}

	fixture.APIReader = apiReaderWith(strictCustomAPIServer())
	if _, err := fixture.Reconcile(context.Background(), req); err != nil {
		t.Fatalf("custom reconcile: %v", err)
	}
	custom := fixture.statefulSet(t)
	customArgs := proxyContainerArgs(t, custom)
	if custom.ResourceVersion == strict.ResourceVersion || reflect.DeepEqual(customArgs, strictArgs) {
		t.Fatal("profile change did not roll the proxy args")
	}
	if !containsArg(customArgs, "--tls-curve-preferences=25,29,23") {
		t.Fatalf("custom args = %v", customArgs)
	}
}

func assertRenderedProxyArgs(t *testing.T, settings pkgtls.ProxyTLS, tlsArgs []string) {
	t.Helper()
	got := renderProxyArgs(t, settings)
	want := append([]string{
		"--secure-listen-address=0.0.0.0:8443",
		"--upstream=http://127.0.0.1:8888/",
		"--logtostderr=true",
		"--v=0",
		"--proxy-endpoints-port=8444",
		"--config-file=/etc/kube-rbac-proxy/config-file.yaml",
		"--tls-cert-file=/etc/tls/private/tls.crt",
		"--tls-private-key-file=/etc/tls/private/tls.key",
		"--auth-header-fields-enabled=true",
		"--auth-header-user-field-name=X-Auth-Request-User",
		"--auth-header-groups-field-name=X-Auth-Request-Groups",
	}, tlsArgs...)
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("args = %#v, want %#v", got, want)
	}
}

func renderProxyArgs(t *testing.T, settings pkgtls.ProxyTLS) []string {
	t.Helper()
	reconciler := &WorkspaceReconciler{Config: &config.EnvConfig{KubeRbacProxyImage: "example.invalid/odh-kube-auth-proxy:test"}}
	workspace := &kubefloworgv1beta1.Workspace{ObjectMeta: metav1.ObjectMeta{Name: "ws", Namespace: "ns"}}
	workspaceKind := &kubefloworgv1beta1.WorkspaceKind{
		Spec: kubefloworgv1beta1.WorkspaceKindSpec{
			PodTemplate: kubefloworgv1beta1.WorkspaceKindPodTemplate{
				Ports: []kubefloworgv1beta1.WorkspaceKindPort{{
					Id:       "jupyterlab",
					Protocol: kubefloworgv1beta1.ImagePortProtocolHTTP,
				}},
			},
		},
	}
	image := kubefloworgv1beta1.ImageConfigSpec{
		Ports: []kubefloworgv1beta1.ImagePort{{Id: "jupyterlab", Port: 8888}},
	}
	sidecar, _ := reconciler.generateKubeRBACProxySidecar(workspace, workspaceKind, image, settings)
	if sidecar == nil {
		t.Fatal("kube-rbac-proxy sidecar was not rendered")
	}
	return sidecar.Args
}

func newGatewayFixture(t *testing.T, apiReader client.Reader) *WorkspaceReconciler {
	t.Helper()
	scheme := runtime.NewScheme()
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))
	utilruntime.Must(kubefloworgv1beta1.AddToScheme(scheme))
	utilruntime.Must(gatewayv1.Install(scheme))
	utilruntime.Must(gatewayv1beta1.Install(scheme))

	workspace := NewExampleWorkspace1("example", "workspaces", "jupyterlab")
	workspaceKind := NewExampleWorkspaceKind1("jupyterlab")
	cl := fake.NewClientBuilder().
		WithScheme(scheme).
		WithStatusSubresource(&kubefloworgv1beta1.Workspace{}).
		WithObjects(workspace, workspaceKind).
		WithIndex(&corev1.ServiceAccount{}, helper.IndexWorkspaceOwnerField, workspaceOwnerIndex).
		WithIndex(&corev1.Service{}, helper.IndexWorkspaceOwnerField, workspaceOwnerIndex).
		WithIndex(&appsv1.StatefulSet{}, helper.IndexWorkspaceOwnerField, workspaceOwnerIndex).
		WithIndex(&rbacv1.RoleBinding{}, helper.IndexWorkspaceOwnerField, workspaceOwnerIndex).
		WithIndex(&corev1.Event{}, helper.IndexEventInvolvedObjectUidField, eventUIDIndex).
		Build()

	return &WorkspaceReconciler{
		Client:    cl,
		APIReader: apiReader,
		Scheme:    scheme,
		Config: &config.EnvConfig{
			UseKubeGateway:       true,
			KubeRbacProxyImage:   "example.invalid/odh-kube-auth-proxy:test",
			KubeGatewayName:      "data-science-gateway",
			KubeGatewayNamespace: "openshift-ingress",
			ControllerNamespace:  "opendatahub",
		},
	}
}

func workspaceOf(t *testing.T, r *WorkspaceReconciler) *kubefloworgv1beta1.Workspace {
	t.Helper()
	workspace := &kubefloworgv1beta1.Workspace{}
	if err := r.Get(context.Background(), exampleReconcileRequest().NamespacedName, workspace); err != nil {
		t.Fatal(err)
	}
	return workspace
}

func (r *WorkspaceReconciler) statefulSet(t *testing.T) *appsv1.StatefulSet {
	t.Helper()
	list := &appsv1.StatefulSetList{}
	if err := r.List(context.Background(), list, client.InNamespace("workspaces")); err != nil {
		t.Fatal(err)
	}
	if len(list.Items) != 1 {
		t.Fatalf("StatefulSet count = %d", len(list.Items))
	}
	return list.Items[0].DeepCopy()
}

func exampleReconcileRequest() ctrl.Request {
	return reconcile.Request{NamespacedName: types.NamespacedName{Name: "example", Namespace: "workspaces"}}
}

func workspaceOwnerIndex(obj client.Object) []string {
	owner := metav1.GetControllerOf(obj)
	if owner == nil {
		return nil
	}
	if owner.APIVersion != kubefloworgv1beta1.GroupVersion.String() || owner.Kind != helper.OwnerKindWorkspace {
		return nil
	}
	return []string{owner.Name}
}

func eventUIDIndex(obj client.Object) []string {
	event, ok := obj.(*corev1.Event)
	if !ok || event.InvolvedObject.UID == "" {
		return nil
	}
	return []string{string(event.InvolvedObject.UID)}
}

func emptyAPIReader() client.Reader {
	return fake.NewClientBuilder().WithScheme(runtime.NewScheme()).Build()
}

func apiReaderWith(obj client.Object) client.Reader {
	return fake.NewClientBuilder().WithScheme(runtime.NewScheme()).WithObjects(obj).Build()
}

func apiServerProfile(profile map[string]any, adherence string) *unstructured.Unstructured {
	obj := &unstructured.Unstructured{}
	obj.SetGroupVersionKind(schema.GroupVersionKind{Group: "config.openshift.io", Version: "v1", Kind: "APIServer"})
	obj.SetName("cluster")
	spec := map[string]any{}
	if profile != nil {
		spec["tlsSecurityProfile"] = profile
	}
	if adherence != "" {
		spec["tlsAdherence"] = adherence
	}
	obj.Object["spec"] = spec
	return obj
}

func strictCustomAPIServer() *unstructured.Unstructured {
	return apiServerProfile(map[string]any{
		"type": "Custom",
		"custom": map[string]any{
			"minTLSVersion": "VersionTLS12",
			"ciphers": []any{
				"ECDHE-RSA-AES256-GCM-SHA384",
				"TLS_AES_128_GCM_SHA256",
				"ECDHE-ECDSA-AES128-GCM-SHA256",
				"DHE-RSA-AES128-GCM-SHA256",
			},
			"groups": []any{"BOGUS", "secp521r1", "X25519", "secp256r1", "secp256r1", "SecP256r1MLKEM768"},
		},
	}, "StrictAllComponents")
}

func tls13APIServer() *unstructured.Unstructured {
	return apiServerProfile(map[string]any{
		"type": "Custom",
		"custom": map[string]any{
			"minTLSVersion": "VersionTLS13",
			"ciphers":       []any{"TLS_AES_128_GCM_SHA256"},
			"groups":        []any{"secp384r1"},
		},
	}, "StrictAllComponents")
}

func tls13NoGroupsAPIServer() *unstructured.Unstructured {
	return apiServerProfile(map[string]any{
		"type": "Custom",
		"custom": map[string]any{
			"minTLSVersion": "VersionTLS13",
			"ciphers":       []any{"TLS_AES_128_GCM_SHA256", "TLS_AES_256_GCM_SHA384"},
		},
	}, "StrictAllComponents")
}

func proxyContainerArgs(t *testing.T, sts *appsv1.StatefulSet) []string {
	t.Helper()
	for _, container := range sts.Spec.Template.Spec.Containers {
		if container.Name == workspaceKubeRbacProxyServicePortName {
			return container.Args
		}
	}
	t.Fatal("kube-rbac-proxy container not found")
	return nil
}

func containsArg(args []string, want string) bool {
	return slices.Contains(args, want)
}

func containsArgPrefix(args []string, prefix string) bool {
	return slices.ContainsFunc(args, func(arg string) bool {
		return strings.HasPrefix(arg, prefix)
	})
}
