package controller

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestApplyKustomizeParamsOverridesRHAIIImage(t *testing.T) {
	dir := t.TempDir()
	bundle := filepath.Join(dir, "distributions", "rhaii")
	require.NoError(t, os.MkdirAll(bundle, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(bundle, "params.env"), []byte("rhaii-dashboard-image=quay.io/opendatahub/rhaii-dashboard:main\nkube-rbac-proxy=quay.io/opendatahub/odh-kube-rbac-proxy:main\ngateway-name=rh-ai-gateway\n"), 0644))
	t.Setenv("RELATED_IMAGE_ODH_RHAII_DASHBOARD_IMAGE", "quay.io/example/rhaii-dashboard@sha256:abc123")
	t.Setenv("RELATED_IMAGE_ODH_KUBE_RBAC_PROXY_IMAGE", "quay.io/example/kube-rbac-proxy@sha256:def456")
	t.Setenv("RELATED_IMAGE_ODH_DASHBOARD_IMAGE", "quay.io/example/odh-dashboard@sha256:def456")

	manifests := []render.ManifestInfo{rhaiiManifestInfo(dir)}
	dashboard := &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "dashboard.example.com"},
	}}
	require.NoError(t, applyKustomizeParams(dashboard, manifests, cluster.XKS))

	data, err := os.ReadFile(filepath.Join(bundle, "params.env"))
	require.NoError(t, err)
	assert.Contains(t, string(data), "rhaii-dashboard-image=quay.io/example/rhaii-dashboard@sha256:abc123")
	assert.Contains(t, string(data), "kube-rbac-proxy=quay.io/example/kube-rbac-proxy@sha256:def456")
	assert.Contains(t, string(data), "gateway-name=rh-ai-gateway")
	assert.NotContains(t, string(data), "odh-dashboard-image=quay.io/example/odh-dashboard@sha256:def456")
	assert.NotContains(t, string(data), "gateway-domain=dashboard.example.com")
	assert.NotContains(t, string(data), "dashboard-url=https://dashboard.example.com/")
}

func TestRenderRHAIIDashboardManifestBundle(t *testing.T) {
	source := filepath.Join("..", "..", "..", "manifests", "distributions", "rhaii")
	engine := kustomize.NewEngine()
	rendered, err := engine.Render(source, kustomize.WithNamespace("redhat-ods-applications"))
	require.NoError(t, err)

	resources := make(map[string]*unstructured.Unstructured, len(rendered))
	for i := range rendered {
		resource := &rendered[i]
		resources[resource.GetKind()+"/"+resource.GetName()] = resource
	}

	deployment := resources["Deployment/rhaii-dashboard"]
	require.NotNil(t, deployment)
	podLabels, found, err := unstructured.NestedStringMap(deployment.Object, "spec", "template", "metadata", "labels")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, "dashboard", podLabels[labels.PlatformPartOf])
	containers, found, err := unstructured.NestedSlice(deployment.Object, "spec", "template", "spec", "containers")
	require.NoError(t, err)
	require.True(t, found)
	container := namedManifestObject(t, containers, "rhaii-dashboard")
	assert.Equal(t, "quay.io/opendatahub/rhaii-dashboard:main", container["image"])
	assert.Contains(t, container["args"], "--platform-type=XKS")
	assert.Equal(t, "dashboard", container["ports"].([]interface{})[0].(map[string]interface{})["name"])
	assert.EqualValues(t, 8080, container["ports"].([]interface{})[0].(map[string]interface{})["containerPort"])

	proxy := namedManifestObject(t, containers, "kube-rbac-proxy")
	assert.Equal(t, "quay.io/opendatahub/odh-kube-rbac-proxy@sha256:0b711ccdd8d5bb01cb8a89cca6b9611c9a064bcc21f53361732b60416fd393f4", proxy["image"])
	assert.Contains(t, proxy["args"], "--secure-listen-address=0.0.0.0:8443")
	assert.Contains(t, proxy["args"], "--upstream=http://127.0.0.1:8080")
	proxyVolumeMounts := proxy["volumeMounts"].([]interface{})
	proxyTokenMount := namedManifestObject(t, proxyVolumeMounts, "dashboard-sa-token")
	assert.Equal(t, "/var/run/secrets/kubernetes.io/serviceaccount", proxyTokenMount["mountPath"])

	service := resources["Service/rhaii-dashboard"]
	require.NotNil(t, service)
	ports, found, err := unstructured.NestedSlice(service.Object, "spec", "ports")
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, ports, 1)
	assert.EqualValues(t, 8443, ports[0].(map[string]interface{})["port"])
	assert.Equal(t, "https", ports[0].(map[string]interface{})["appProtocol"])
	assert.Equal(t, "dashboard-ui", ports[0].(map[string]interface{})["targetPort"])

	certificate := resources["Certificate/"+rhaiiDashboardTLSName]
	require.NotNil(t, certificate)
	issuerName, found, err := unstructured.NestedString(certificate.Object, "spec", "issuerRef", "name")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, "rhai-ca-issuer", issuerName)
	issuerKind, found, err := unstructured.NestedString(certificate.Object, "spec", "issuerRef", "kind")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, "ClusterIssuer", issuerKind)
	issuerGroup, found, err := unstructured.NestedString(certificate.Object, "spec", "issuerRef", "group")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, defaultCertManagerIssuerRefGroup, issuerGroup)
	secretName, found, err := unstructured.NestedString(certificate.Object, "spec", "secretName")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, rhaiiDashboardTLSName, secretName)
	dnsNames, found, err := unstructured.NestedStringSlice(certificate.Object, "spec", "dnsNames")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, []string{
		"rhaii-dashboard.redhat-ods-applications.svc",
		"rhaii-dashboard.redhat-ods-applications.svc.cluster.local",
	}, dnsNames)

	route := resources["HTTPRoute/rhaii-dashboard"]
	require.NotNil(t, route)
	parents, found, err := unstructured.NestedSlice(route.Object, "spec", "parentRefs")
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, parents, 1)
	assert.Equal(t, "rh-ai-gateway", parents[0].(map[string]interface{})["name"])
	assert.Equal(t, "rh-ai-gateway", parents[0].(map[string]interface{})["namespace"])

	for _, kind := range []string{"ServiceAccount", "Role", "RoleBinding", "ClusterRole", "ClusterRoleBinding", "Service", "NetworkPolicy", "PodDisruptionBudget"} {
		assert.Contains(t, resources, kind+"/rhaii-dashboard")
	}
	assert.Contains(t, resources, "ConfigMap/rhaii-dashboard-kube-rbac-proxy-config")
	proxyConfig := resources["ConfigMap/rhaii-dashboard-kube-rbac-proxy-config"]
	proxyConfigData, found, err := unstructured.NestedString(proxyConfig.Object, "data", "config-file.yaml")
	require.NoError(t, err)
	require.True(t, found)
	assert.Contains(t, proxyConfigData, "apiGroup: dashboard.opendatahub.io")
	assert.Contains(t, proxyConfigData, "resource: rhaii-dashboard-access")

	clusterRole := resources["ClusterRole/rhaii-dashboard"]
	require.NotNil(t, clusterRole)
	rules, found, err := unstructured.NestedSlice(clusterRole.Object, "rules")
	require.NoError(t, err)
	require.True(t, found)
	assert.True(t, manifestRBACRuleExists(rules, "authentication.k8s.io", "tokenreviews", "create"))
	assert.True(t, manifestRBACRuleExists(rules, "authorization.k8s.io", "subjectaccessreviews", "create"))

	accessRole := resources["ClusterRole/rhaii-dashboard-access"]
	require.NotNil(t, accessRole)
	accessRules, found, err := unstructured.NestedSlice(accessRole.Object, "rules")
	require.NoError(t, err)
	require.True(t, found)
	assert.True(t, manifestRBACRuleExists(accessRules, "dashboard.opendatahub.io", "rhaii-dashboard-access", "list"))
	assert.NotContains(t, resources, "ClusterRoleBinding/rhaii-dashboard-access")

	serviceAccount := resources["ServiceAccount/rhaii-dashboard"]
	require.NotNil(t, serviceAccount)
	assert.Equal(t, "redhat-ods-applications", serviceAccount.GetNamespace())

	for _, kind := range []string{"RoleBinding", "ClusterRoleBinding"} {
		binding := resources[kind+"/rhaii-dashboard"]
		require.NotNil(t, binding)
		subjects, found, err := unstructured.NestedSlice(binding.Object, "subjects")
		require.NoError(t, err)
		require.True(t, found)
		subject := namedManifestObject(t, subjects, "rhaii-dashboard")
		assert.Equal(t, "redhat-ods-applications", subject["namespace"])
	}
}

func TestRHAIICertificateUsesApplicationsNamespaceAndDNSNames(t *testing.T) {
	source := filepath.Join("..", "..", "..", "manifests", "distributions", "rhaii")
	bundle := filepath.Join(t.TempDir(), "rhaii")
	require.NoError(t, os.MkdirAll(bundle, 0755))
	require.NoError(t, os.CopyFS(bundle, os.DirFS(source)))
	applicationsNamespace := strings.Repeat("a", 63)

	manifests := []render.ManifestInfo{{Path: bundle}}
	require.NoError(t, applyKustomizeParamsWithOverrides(&v1alpha1.Dashboard{}, manifests, cluster.XKS, map[string]string{
		"rhaii-dashboard-namespace": applicationsNamespace,
	}))

	rendered, err := kustomize.NewEngine().Render(bundle, kustomize.WithNamespace(applicationsNamespace))
	require.NoError(t, err)

	for i := range rendered {
		resource := &rendered[i]
		if resource.GetKind() != "Certificate" || resource.GetName() != rhaiiDashboardTLSName {
			continue
		}

		commonName, found, err := unstructured.NestedString(resource.Object, "spec", "commonName")
		require.NoError(t, err)
		assert.False(t, found)
		assert.Empty(t, commonName)

		dnsNames, found, err := unstructured.NestedStringSlice(resource.Object, "spec", "dnsNames")
		require.NoError(t, err)
		require.True(t, found)
		assert.Equal(t, []string{
			"rhaii-dashboard." + applicationsNamespace + ".svc",
			"rhaii-dashboard." + applicationsNamespace + ".svc.cluster.local",
		}, dnsNames)
		return
	}

	require.Fail(t, "rhaii dashboard Certificate was not rendered")
}

func TestRHAIICertificateUsesIssuerGroupOverride(t *testing.T) {
	source := filepath.Join("..", "..", "..", "manifests", "distributions", "rhaii")
	bundle := filepath.Join(t.TempDir(), "rhaii")
	require.NoError(t, os.MkdirAll(bundle, 0755))
	require.NoError(t, os.CopyFS(bundle, os.DirFS(source)))

	manifests := []render.ManifestInfo{{Path: bundle}}
	require.NoError(t, applyKustomizeParamsWithOverrides(&v1alpha1.Dashboard{}, manifests, cluster.XKS, map[string]string{
		"certificate-issuer-group": "awspca.cert-manager.io",
	}))

	rendered, err := kustomize.NewEngine().Render(bundle, kustomize.WithNamespace("applications"))
	require.NoError(t, err)
	for i := range rendered {
		resource := &rendered[i]
		if resource.GetKind() != "Certificate" || resource.GetName() != rhaiiDashboardTLSName {
			continue
		}

		issuerGroup, found, err := unstructured.NestedString(resource.Object, "spec", "issuerRef", "group")
		require.NoError(t, err)
		require.True(t, found)
		assert.Equal(t, "awspca.cert-manager.io", issuerGroup)
		return
	}

	require.Fail(t, "rhaii dashboard Certificate was not rendered")
}

func manifestRBACRuleExists(rules []interface{}, apiGroup, resource, verb string) bool {
	for _, rule := range rules {
		ruleMap, ok := rule.(map[string]interface{})
		if !ok {
			continue
		}
		apiGroups, _ := ruleMap["apiGroups"].([]interface{})
		resources, _ := ruleMap["resources"].([]interface{})
		verbs, _ := ruleMap["verbs"].([]interface{})
		if containsManifestString(apiGroups, apiGroup) && containsManifestString(resources, resource) && containsManifestString(verbs, verb) {
			return true
		}
	}
	return false
}

func containsManifestString(values []interface{}, want string) bool {
	for _, value := range values {
		if value == want {
			return true
		}
	}
	return false
}
