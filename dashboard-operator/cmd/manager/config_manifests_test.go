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
)

// renderedConfig holds the objects of one kustomize build of config/.
type renderedConfig struct {
	deployment   *appsv1.Deployment
	vwcs         []admissionregistrationv1.ValidatingWebhookConfiguration
	services     map[string]corev1.Service
	certificates map[string]*unstructured.Unstructured
	issuers      map[string]bool
}

func renderConfig(t *testing.T, overlay string) renderedConfig {
	t.Helper()
	k := krusty.MakeKustomizer(krusty.MakeDefaultOptions())
	resMap, err := k.Run(filesys.MakeFsOnDisk(), "../../config/"+overlay)
	require.NoError(t, err, "kustomize build config/%s", overlay)

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
			require.Nil(t, out.deployment, "config/%s renders more than one Deployment", overlay)
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
	require.NotNil(t, out.deployment, "config/%s renders no Deployment", overlay)
	return out
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
	for overlay, wantWebhook := range map[string]bool{
		"default":         false,
		"webhook-enabled": true,
	} {
		t.Run(overlay, func(t *testing.T) {
			cfg := renderConfig(t, overlay)
			mgr := cfg.manager(t)

			flagSet := false
			for _, arg := range mgr.Args {
				if arg == enableWebhookFlag || arg == enableWebhookFlag+"=true" {
					flagSet = true
				}
			}
			assert.Equal(t, wantWebhook, flagSet, "%s on the manager", enableWebhookFlag)
			assert.Equal(t, flagSet, len(cfg.vwcs) > 0,
				"ValidatingWebhookConfiguration present (%d) must match %s (%v)", len(cfg.vwcs), enableWebhookFlag, flagSet)

			for key, cert := range cfg.certificates {
				kind, _, _ := unstructured.NestedString(cert.Object, "spec", "issuerRef", "kind")
				name, _, _ := unstructured.NestedString(cert.Object, "spec", "issuerRef", "name")
				if kind == "Issuer" {
					assert.True(t, cfg.issuers[cert.GetNamespace()+"/"+name],
						"Certificate %s references Issuer %q, which is not rendered", key, name)
				}
			}

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

	require.Len(t, cfg.vwcs, 1)
	vwc := cfg.vwcs[0]
	require.Len(t, vwc.Webhooks, 1)
	ref := vwc.Webhooks[0].ClientConfig.Service
	require.NotNil(t, ref, "webhook must call an in-cluster Service")
	assert.Equal(t, ns, ref.Namespace, "webhook Service namespace")

	svc, ok := cfg.services[ref.Namespace+"/"+ref.Name]
	require.True(t, ok, "webhook Service %s/%s is not rendered", ref.Namespace, ref.Name)
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
	dnsNames, _, _ := unstructured.NestedStringSlice(cert.Object, "spec", "dnsNames")
	assert.Contains(t, dnsNames, fmt.Sprintf("%s.%s.svc", svc.Name, svc.Namespace), "serving cert SANs")
}
