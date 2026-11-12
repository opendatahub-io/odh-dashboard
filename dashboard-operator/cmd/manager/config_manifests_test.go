package main

import (
	"fmt"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	admissionregistrationv1 "k8s.io/api/admissionregistration/v1"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/kustomize/api/krusty"
	"sigs.k8s.io/kustomize/kyaml/filesys"
)

const (
	enableWebhookFlag  = "--enable-webhook"
	webhookPortFlag    = "--webhook-port="
	webhookCertDir     = "/tmp/k8s-webhook-server/serving-certs"
	injectCAAnnotation = "cert-manager.io/inject-ca-from"
	dashboardVWCName   = "dashboard-validating-webhook"
	metricsCertName    = "dashboard-operator-metrics-cert"
	metricsServiceName = "dashboard-operator-metrics-service"
)

// renderedConfig holds the objects of one kustomize build of config/.
type renderedConfig struct {
	deployment   *appsv1.Deployment
	vwcs         []admissionregistrationv1.ValidatingWebhookConfiguration
	services     map[string]corev1.Service
	certificates map[string]*unstructured.Unstructured
	issuers      map[string]bool
}

// renderConfig runs `kustomize build` on dir (relative to this package) with
// the default load restrictor, as a user would.
func renderConfig(t *testing.T, dir string) renderedConfig {
	t.Helper()
	k := krusty.MakeKustomizer(krusty.MakeDefaultOptions())
	resMap, err := k.Run(filesys.MakeFsOnDisk(), dir)
	require.NoError(t, err, "kustomize build %s", dir)

	out := renderedConfig{
		services:     map[string]corev1.Service{},
		certificates: map[string]*unstructured.Unstructured{},
		issuers:      map[string]bool{},
	}
	for _, res := range resMap.Resources() {
		obj, err := res.Map()
		require.NoError(t, err)
		u := &unstructured.Unstructured{Object: obj}
		switch u.GetKind() {
		case "Deployment":
			require.Nil(t, out.deployment, "%s renders more than one Deployment", dir)
			out.deployment = &appsv1.Deployment{}
			require.NoError(t, runtime.DefaultUnstructuredConverter.FromUnstructured(obj, out.deployment))
		case "ValidatingWebhookConfiguration":
			var vwc admissionregistrationv1.ValidatingWebhookConfiguration
			require.NoError(t, runtime.DefaultUnstructuredConverter.FromUnstructured(obj, &vwc))
			out.vwcs = append(out.vwcs, vwc)
		case "Service":
			var svc corev1.Service
			require.NoError(t, runtime.DefaultUnstructuredConverter.FromUnstructured(obj, &svc))
			out.services[svc.Namespace+"/"+svc.Name] = svc
		case "Certificate":
			out.certificates[u.GetNamespace()+"/"+u.GetName()] = u
		case "Issuer":
			out.issuers[u.GetNamespace()+"/"+u.GetName()] = true
		}
	}
	require.NotNil(t, out.deployment, "%s renders no Deployment", dir)
	return out
}

// dashboardVWCs returns the rendered dashboard webhook configurations, whatever
// namePrefix an overlay applied.
func (r renderedConfig) dashboardVWCs() []admissionregistrationv1.ValidatingWebhookConfiguration {
	var out []admissionregistrationv1.ValidatingWebhookConfiguration
	for _, vwc := range r.vwcs {
		if strings.HasSuffix(vwc.Name, dashboardVWCName) {
			out = append(out, vwc)
		}
	}
	return out
}

// certByNameSuffix returns the one rendered Certificate whose name ends in suffix,
// whatever namePrefix an overlay applied.
func (r renderedConfig) certByNameSuffix(t *testing.T, suffix string) *unstructured.Unstructured {
	t.Helper()
	var found *unstructured.Unstructured
	for _, cert := range r.certificates {
		if strings.HasSuffix(cert.GetName(), suffix) {
			require.Nil(t, found, "more than one Certificate named *%s", suffix)
			found = cert
		}
	}
	require.NotNil(t, found, "no Certificate named *%s", suffix)
	return found
}

func (r renderedConfig) manager(t *testing.T) corev1.Container {
	t.Helper()
	for _, c := range r.deployment.Spec.Template.Spec.Containers {
		if c.Name == "manager" {
			return c
		}
	}
	require.FailNow(t, "manager container not found")
	return corev1.Container{}
}

// TestConfigWebhookGating guards RHOAIENG-98919: a ValidatingWebhookConfiguration
// with failurePolicy Fail must never be applied unless the manager also runs
// the webhook server, and vice versa. This mirrors the Helm chart, which gates
// both on webhook.enabled (default false).
func TestConfigWebhookGating(t *testing.T) {
	for _, tc := range []struct {
		name        string
		dir         string
		wantWebhook bool
		wantNS      string
		// otherCARefs are inject-ca-from values of unrelated webhooks in the
		// overlay, keyed by rendered name; the wiring must leave them alone.
		otherCARefs map[string]string
	}{
		{name: "default", dir: "../../config/default", wantWebhook: false, wantNS: "opendatahub"},
		{name: "webhook-enabled", dir: "../../config/webhook-enabled", wantWebhook: true, wantNS: "opendatahub"},
		// A downstream overlay that changes namespace and namePrefix and
		// re-applies config/webhook/wiring must keep the wiring consistent.
		{
			name: "parent-overlay", dir: "testdata/parent-overlay", wantWebhook: true, wantNS: "custom-ns",
			otherCARefs: map[string]string{"custom-other-validating-webhook": "other-ns/other-cert"},
		},
	} {
		wantWebhook := tc.wantWebhook
		t.Run(tc.name, func(t *testing.T) {
			cfg := renderConfig(t, tc.dir)
			require.Equal(t, tc.wantNS, cfg.deployment.Namespace, "Deployment namespace")
			mgr := cfg.manager(t)

			flagSet := false
			for _, arg := range mgr.Args {
				if arg == enableWebhookFlag || arg == enableWebhookFlag+"=true" {
					flagSet = true
				}
			}
			assert.Equal(t, wantWebhook, flagSet, "%s on the manager", enableWebhookFlag)
			dashboardVWCs := cfg.dashboardVWCs()
			assert.Equal(t, flagSet, len(dashboardVWCs) > 0,
				"dashboard ValidatingWebhookConfiguration present (%d) must match %s (%v)", len(dashboardVWCs), enableWebhookFlag, flagSet)

			for key, cert := range cfg.certificates {
				kind, _, _ := unstructured.NestedString(cert.Object, "spec", "issuerRef", "kind")
				name, _, _ := unstructured.NestedString(cert.Object, "spec", "issuerRef", "name")
				if kind == "Issuer" {
					assert.True(t, cfg.issuers[cert.GetNamespace()+"/"+name],
						"Certificate %s references Issuer %q, which is not rendered", key, name)
				}
			}

			for name, want := range tc.otherCARefs {
				found := false
				for _, vwc := range cfg.vwcs {
					if vwc.Name == name {
						found = true
						assert.Equal(t, want, vwc.Annotations[injectCAAnnotation],
							"unrelated webhook %s: %s rewritten", name, injectCAAnnotation)
					}
				}
				assert.True(t, found, "unrelated webhook %s is not rendered", name)
			}

			// The metrics serving cert is in every install; its SANs must name
			// the rendered metrics Service.
			metricsCert := cfg.certByNameSuffix(t, metricsCertName)
			prefix := strings.TrimSuffix(metricsCert.GetName(), metricsCertName)
			metricsSvc, ok := cfg.services[metricsCert.GetNamespace()+"/"+prefix+metricsServiceName]
			require.True(t, ok, "metrics Service %s%s is not rendered", prefix, metricsServiceName)
			assertCertSANs(t, metricsCert, metricsSvc)

			if wantWebhook {
				assertWebhookWiring(t, cfg, mgr)
			} else {
				for _, m := range mgr.VolumeMounts {
					assert.NotEqual(t, webhookCertDir, m.MountPath, "webhook cert mounted while the webhook is off")
				}
			}
		})
	}
}

// assertWebhookWiring checks that the webhook config, Service, serving cert and
// manager agree on names, namespace and port.
func assertWebhookWiring(t *testing.T, cfg renderedConfig, mgr corev1.Container) {
	t.Helper()
	ns := cfg.deployment.Namespace

	port := ""
	for _, arg := range mgr.Args {
		if strings.HasPrefix(arg, webhookPortFlag) {
			port = strings.TrimPrefix(arg, webhookPortFlag)
		}
	}
	require.NotEmpty(t, port, "manager needs %s<port>", webhookPortFlag)
	hasContainerPort := false
	for _, p := range mgr.Ports {
		if fmt.Sprint(p.ContainerPort) == port {
			hasContainerPort = true
		}
	}
	assert.True(t, hasContainerPort, "manager does not expose webhook port %s", port)

	certSecret := ""
	for _, m := range mgr.VolumeMounts {
		if m.MountPath != webhookCertDir {
			continue
		}
		for _, v := range cfg.deployment.Spec.Template.Spec.Volumes {
			if v.Name == m.Name && v.Secret != nil {
				certSecret = v.Secret.SecretName
			}
		}
	}
	require.NotEmpty(t, certSecret, "manager must mount a Secret at %s", webhookCertDir)

	dashboardVWCs := cfg.dashboardVWCs()
	require.Len(t, dashboardVWCs, 1)
	vwc := dashboardVWCs[0]
	require.Len(t, vwc.Webhooks, 1)
	require.Len(t, vwc.Webhooks[0].Rules, 2)
	dashboardRule := vwc.Webhooks[0].Rules[0]
	assert.ElementsMatch(t, []admissionregistrationv1.OperationType{
		admissionregistrationv1.Create,
		admissionregistrationv1.Update,
	}, dashboardRule.Operations)
	assert.Equal(t, []string{"components.platform.opendatahub.io"}, dashboardRule.APIGroups)
	assert.Equal(t, []string{"dashboards"}, dashboardRule.Resources)
	namespaceRule := vwc.Webhooks[0].Rules[1]
	assert.ElementsMatch(t, []admissionregistrationv1.OperationType{
		admissionregistrationv1.Create,
		admissionregistrationv1.Update,
	}, namespaceRule.Operations)
	assert.Equal(t, []string{""}, namespaceRule.APIGroups)
	assert.ElementsMatch(t, []string{"namespaces", "namespaces/status", "namespaces/finalize"}, namespaceRule.Resources)
	require.Len(t, vwc.Webhooks[0].MatchConditions, 1)
	assert.Equal(t, "namespaced-rbac-consent-label-changed", vwc.Webhooks[0].MatchConditions[0].Name)
	assert.Contains(t, vwc.Webhooks[0].MatchConditions[0].Expression,
		"object.?metadata.labels['dashboard.opendatahub.io/allow-namespaced-rbac'].orValue('')")
	ref := vwc.Webhooks[0].ClientConfig.Service
	require.NotNil(t, ref, "webhook must call an in-cluster Service")
	assert.Equal(t, ns, ref.Namespace, "webhook Service namespace")

	svc, ok := cfg.services[ref.Namespace+"/"+ref.Name]
	require.True(t, ok, "webhook Service %s/%s is not rendered", ref.Namespace, ref.Name)
	require.NotEmpty(t, svc.Spec.Selector, "webhook Service must select the manager pods")
	require.Len(t, svc.Spec.Ports, 1)
	assert.Equal(t, port, svc.Spec.Ports[0].TargetPort.String(), "webhook Service targetPort")
	for k, v := range svc.Spec.Selector {
		assert.Equal(t, v, cfg.deployment.Spec.Template.Labels[k], "webhook Service selector %s", k)
	}

	certKey := vwc.Annotations[injectCAAnnotation]
	cert, ok := cfg.certificates[certKey]
	require.True(t, ok, "%s=%q does not name a rendered Certificate", injectCAAnnotation, certKey)
	secretName, _, _ := unstructured.NestedString(cert.Object, "spec", "secretName")
	assert.Equal(t, certSecret, secretName, "serving cert Secret mounted by the manager")
	assertCertSANs(t, cert, svc)
}

// assertCertSANs checks that cert is valid for both in-cluster names of svc.
func assertCertSANs(t *testing.T, cert *unstructured.Unstructured, svc corev1.Service) {
	t.Helper()
	dnsNames, _, _ := unstructured.NestedStringSlice(cert.Object, "spec", "dnsNames")
	assert.ElementsMatch(t, []string{
		fmt.Sprintf("%s.%s.svc", svc.Name, svc.Namespace),
		fmt.Sprintf("%s.%s.svc.cluster.local", svc.Name, svc.Namespace),
	}, dnsNames, "%s SANs", cert.GetName())
}
