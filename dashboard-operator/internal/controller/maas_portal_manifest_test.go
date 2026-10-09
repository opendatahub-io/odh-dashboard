package controller

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"
)

const (
	maasPortalName         = "maas-portal"
	maasPortalCoreBFFImage = "registry.example.com/odh-core-bff@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
)

func TestRenderCoreDashboardRouteHasNoHostnames(t *testing.T) {
	source := filepath.Join("..", "..", "..", "manifests", "rhoai")
	engine := kustomize.NewEngine()
	rendered, err := engine.Render(source, kustomize.WithNamespace("dashboard-test"))
	require.NoError(t, err)

	for i := range rendered {
		resource := &rendered[i]
		if resource.GetKind() != "HTTPRoute" || resource.GetName() != "rhods-dashboard" {
			continue
		}

		_, found, err := unstructured.NestedStringSlice(resource.Object, "spec", "hostnames")
		require.NoError(t, err)
		assert.False(t, found, "the core dashboard catch-all route must not set hostnames")
		parentRefs, found, err := unstructured.NestedSlice(resource.Object, "spec", "parentRefs")
		require.NoError(t, err)
		require.True(t, found)
		require.Len(t, parentRefs, 1)
		assert.Equal(t, "data-science-gateway", parentRefs[0].(map[string]interface{})["name"])
		return
	}

	require.Fail(t, "core dashboard HTTPRoute was not rendered")
}

func TestRenderMaaSPortalManifestBundle(t *testing.T) {
	// Render a copy of the checked-in bundle: reconciliation writes params.env at
	// runtime, so rendering the source directory directly would mutate the worktree.
	source := filepath.Join("..", "..", "..", "manifests", "distributions", maasPortalName)
	dir := filepath.Join(t.TempDir(), maasPortalName)
	require.NoError(t, os.CopyFS(dir, os.DirFS(source)))

	params := readExistingParams(filepath.Join(dir, "params.env"))
	params["core-bff-image"] = maasPortalCoreBFFImage
	params["dashboard-namespace"] = "portal-test"
	params["perses-namespace"] = "custom-perses"
	params["operator-namespace"] = "custom-operators"
	params["gateway-name"] = "portal-gateway"
	params["maas-portal-federation-config"] = "maas-portal-federation-test"
	require.NoError(t, writeParamsEnv(dir, params))

	engine := kustomize.NewEngine()
	rendered, err := engine.Render(dir, kustomize.WithNamespace("portal-test"))
	require.NoError(t, err)
	rendered = setMaaSPortalOperatorSubscriptionNamespaces(rendered, "custom-operators")
	require.Len(t, rendered, 19, "bundle must include scoped subscription RBAC in default and configured operator namespaces")

	resources := make(map[string]*unstructured.Unstructured, len(rendered))
	for i := range rendered {
		resource := &rendered[i]
		resources[resource.GetKind()+"/"+resource.GetName()] = resource
		resources[resource.GetKind()+"/"+resource.GetName()+"/"+resource.GetNamespace()] = resource
		assert.Equal(t, maasPortalName, resource.GetLabels()["app.kubernetes.io/component"])
		assert.Equal(t, maasPortalName, resource.GetLabels()["app.kubernetes.io/part-of"])
		assert.Equal(t, maasPortalName, resource.GetLabels()["platform.opendatahub.io/part-of"])
	}

	deployment := resources["Deployment/"+maasPortalName]
	require.NotNil(t, deployment)
	replicas, found, err := unstructured.NestedInt64(deployment.Object, "spec", "replicas")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, int64(1), replicas)

	podLabels, found, err := unstructured.NestedStringMap(deployment.Object, "spec", "template", "metadata", "labels")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, maasPortalName, podLabels["deployment"])
	assert.Equal(t, maasPortalName, podLabels["app.kubernetes.io/component"])
	assert.Equal(t, maasPortalName, podLabels["app.kubernetes.io/part-of"])
	assert.Equal(t, maasPortalName, podLabels["platform.opendatahub.io/part-of"])

	serviceAccount, found, err := unstructured.NestedString(deployment.Object, "spec", "template", "spec", "serviceAccountName")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, maasPortalName, serviceAccount)
	automount, found, err := unstructured.NestedBool(deployment.Object, "spec", "template", "spec", "automountServiceAccountToken")
	require.NoError(t, err)
	require.True(t, found)
	assert.False(t, automount)

	containers, found, err := unstructured.NestedSlice(deployment.Object, "spec", "template", "spec", "containers")
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, containers, 1)
	container := containers[0].(map[string]interface{})
	assert.Equal(t, maasPortalCoreBFFImage, container["image"])
	assert.Equal(t, "custom-operators", namedManifestObject(t, container["env"].([]interface{}), "OPERATOR_NAMESPACE")["value"])
	assert.Contains(t, container["args"], "--deployment-mode=standalone")
	assert.Contains(t, container["args"], "--platform-type=OpenShift")
	assert.Contains(t, container["args"], "--namespace=portal-test")
	assert.Contains(t, container["args"], "--static-assets-dir=/static/maas-portal")
	assert.Contains(t, container["args"], "--mf-remotes-config=/etc/odh-dashboard/maas-portal-federation-config.json")
	containerSecurityContext := container["securityContext"].(map[string]interface{})
	assert.Equal(t, true, containerSecurityContext["runAsNonRoot"])
	assert.Equal(t, true, containerSecurityContext["readOnlyRootFilesystem"])
	assert.Equal(t, false, containerSecurityContext["allowPrivilegeEscalation"])
	capabilities := containerSecurityContext["capabilities"].(map[string]interface{})
	assert.Contains(t, capabilities["drop"], "ALL")
	containerResources := container["resources"].(map[string]interface{})
	containerLimits := containerResources["limits"].(map[string]interface{})
	assert.Equal(t, "100m", containerLimits["cpu"])
	assert.Equal(t, "256Mi", containerLimits["memory"])
	assert.Equal(t, map[string]interface{}{
		"httpGet":             map[string]interface{}{"path": "/healthcheck", "port": int64(8443), "scheme": "HTTPS"},
		"initialDelaySeconds": int64(1),
		"timeoutSeconds":      int64(5),
		"periodSeconds":       int64(2),
		"failureThreshold":    int64(30),
	}, container["startupProbe"])
	assert.Equal(t, map[string]interface{}{
		"httpGet":          map[string]interface{}{"path": "/healthcheck", "port": int64(8443), "scheme": "HTTPS"},
		"timeoutSeconds":   int64(10),
		"periodSeconds":    int64(10),
		"successThreshold": int64(1),
		"failureThreshold": int64(3),
	}, container["livenessProbe"])
	assert.Equal(t, map[string]interface{}{
		"httpGet":          map[string]interface{}{"path": "/healthcheck", "port": int64(8443), "scheme": "HTTPS"},
		"timeoutSeconds":   int64(10),
		"periodSeconds":    int64(5),
		"successThreshold": int64(1),
		"failureThreshold": int64(3),
	}, container["readinessProbe"])

	volumeMounts := container["volumeMounts"].([]interface{})
	assert.Equal(t, "/etc/tls/private", namedManifestObject(t, volumeMounts, "portal-tls")["mountPath"])
	assert.Equal(t, "/etc/odh-dashboard", namedManifestObject(t, volumeMounts, "maas-portal-federation-config")["mountPath"])
	assert.Equal(t, "/var/run/secrets/kubernetes.io/serviceaccount", namedManifestObject(t, volumeMounts, "portal-sa-token")["mountPath"])

	volumes, found, err := unstructured.NestedSlice(deployment.Object, "spec", "template", "spec", "volumes")
	require.NoError(t, err)
	require.True(t, found)
	federationVolume := namedManifestObject(t, volumes, "maas-portal-federation-config")
	federationConfigMap := federationVolume["configMap"].(map[string]interface{})
	assert.Equal(t, "maas-portal-federation-test", federationConfigMap["name"])
	require.NotNil(t, namedManifestObject(t, volumes, "portal-tls")["secret"])
	require.NotNil(t, namedManifestObject(t, volumes, "portal-sa-token")["projected"])

	service := resources["Service/"+maasPortalName]
	require.NotNil(t, service)
	assert.Equal(t, maasPortalName+"-tls", service.GetAnnotations()["service.beta.openshift.io/serving-cert-secret-name"])
	assert.Equal(t, "HTTPS", service.GetAnnotations()["service.beta.kubernetes.io/backend-protocol"])

	route := resources["HTTPRoute/"+maasPortalName]
	require.NotNil(t, route)
	_, found, err = unstructured.NestedStringSlice(route.Object, "spec", "hostnames")
	require.NoError(t, err)
	assert.False(t, found, "path-partitioned routes must not set hostnames")
	rules, found, err := unstructured.NestedSlice(route.Object, "spec", "rules")
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, rules, 2)
	redirect := rules[0].(map[string]interface{})
	assert.Equal(t, "Exact", redirect["matches"].([]interface{})[0].(map[string]interface{})["path"].(map[string]interface{})["type"])
	assert.Equal(t, "/maas-consumer-portal", redirect["matches"].([]interface{})[0].(map[string]interface{})["path"].(map[string]interface{})["value"])
	redirectFilter := redirect["filters"].([]interface{})[0].(map[string]interface{})
	assert.Equal(t, "RequestRedirect", redirectFilter["type"])
	redirectPath := redirectFilter["requestRedirect"].(map[string]interface{})["path"].(map[string]interface{})
	assert.Equal(t, "ReplaceFullPath", redirectPath["type"])
	assert.Equal(t, "/maas-consumer-portal/", redirectPath["replaceFullPath"])
	assert.Equal(t, int64(302), redirectFilter["requestRedirect"].(map[string]interface{})["statusCode"])
	proxy := rules[1].(map[string]interface{})
	assert.Equal(t, "PathPrefix", proxy["matches"].([]interface{})[0].(map[string]interface{})["path"].(map[string]interface{})["type"])
	assert.Equal(t, "/maas-consumer-portal", proxy["matches"].([]interface{})[0].(map[string]interface{})["path"].(map[string]interface{})["value"])
	proxyFilter := proxy["filters"].([]interface{})[0].(map[string]interface{})
	assert.Equal(t, "URLRewrite", proxyFilter["type"])
	proxyPath := proxyFilter["urlRewrite"].(map[string]interface{})["path"].(map[string]interface{})
	assert.Equal(t, "ReplacePrefixMatch", proxyPath["type"])
	assert.Equal(t, "/", proxyPath["replacePrefixMatch"])
	backendRefs := proxy["backendRefs"].([]interface{})
	require.Len(t, backendRefs, 1)
	assert.Equal(t, maasPortalName, backendRefs[0].(map[string]interface{})["name"])
	assert.Equal(t, int64(8443), backendRefs[0].(map[string]interface{})["port"])
	parentRefs, found, err := unstructured.NestedSlice(route.Object, "spec", "parentRefs")
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, parentRefs, 1)
	gatewayName := parentRefs[0].(map[string]interface{})["name"]
	assert.Equal(t, "portal-gateway", gatewayName)

	roleBinding := resources["ClusterRoleBinding/"+maasPortalName]
	require.NotNil(t, roleBinding)
	subjects, found, err := unstructured.NestedSlice(roleBinding.Object, "subjects")
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, subjects, 1)
	subjectNamespace := subjects[0].(map[string]interface{})["namespace"]
	assert.Equal(t, "portal-test", subjectNamespace)
	role := resources["ClusterRole/"+maasPortalName]
	require.NotNil(t, role)
	rules, found, err = unstructured.NestedSlice(role.Object, "rules")
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, rules, 2, "portal ClusterRole is limited to cluster-scoped DSC and ingress discovery")
	assert.Equal(t, []interface{}{"datasciencecluster.opendatahub.io"}, rules[0].(map[string]interface{})["apiGroups"])
	assert.Equal(t, []interface{}{"datascienceclusters"}, rules[0].(map[string]interface{})["resources"])
	assert.Equal(t, []interface{}{"get", "list"}, rules[0].(map[string]interface{})["verbs"])
	assert.Equal(t, []interface{}{"config.openshift.io"}, rules[1].(map[string]interface{})["apiGroups"])
	assert.Equal(t, []interface{}{"ingresses"}, rules[1].(map[string]interface{})["resources"])
	assert.Equal(t, []interface{}{"get"}, rules[1].(map[string]interface{})["verbs"])

	assertOperatorSubscriptionRole(t, resources, "redhat-ods-operator", "rhods-operator")
	assertOperatorSubscriptionRole(t, resources, "opendatahub-operator", "opendatahub-operator")
	assertOperatorSubscriptionRole(t, resources, "openshift-operators", "opendatahub-operator")
	assertOperatorSubscriptionRole(t, resources, "custom-operators", "rhods-operator")
	assertOperatorSubscriptionRole(t, resources, "custom-operators", "opendatahub-operator")

	networkPolicy := resources["NetworkPolicy/"+maasPortalName]
	require.NotNil(t, networkPolicy)
	egress, found, err := unstructured.NestedSlice(networkPolicy.Object, "spec", "egress")
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, egress, 4, "base portal egress is limited to DNS, Kubernetes API, MaaS, and GenAI")
	assert.Equal(t, []interface{}{map[string]interface{}{"namespaceSelector": map[string]interface{}{"matchLabels": map[string]interface{}{"kubernetes.io/metadata.name": "openshift-dns"}}}}, egress[0].(map[string]interface{})["to"])
	assert.Equal(t, []interface{}{map[string]interface{}{"protocol": "UDP", "port": int64(5353)}, map[string]interface{}{"protocol": "TCP", "port": int64(5353)}}, egress[0].(map[string]interface{})["ports"])
	assert.Equal(t, []interface{}{map[string]interface{}{"ipBlock": map[string]interface{}{"cidr": "0.0.0.0/0"}}}, egress[1].(map[string]interface{})["to"])
	assert.Equal(t, []interface{}{map[string]interface{}{"protocol": "TCP", "port": int64(6443)}}, egress[1].(map[string]interface{})["ports"])
	assert.Equal(t, []interface{}{map[string]interface{}{
		"namespaceSelector": map[string]interface{}{"matchLabels": map[string]interface{}{"kubernetes.io/metadata.name": "portal-test"}},
		"podSelector":       map[string]interface{}{"matchLabels": map[string]interface{}{"deployment": "maas-ui"}},
	}}, egress[2].(map[string]interface{})["to"])
	assert.Equal(t, []interface{}{map[string]interface{}{"protocol": "TCP", "port": int64(8243)}}, egress[2].(map[string]interface{})["ports"])
	assert.Equal(t, []interface{}{map[string]interface{}{
		"namespaceSelector": map[string]interface{}{"matchLabels": map[string]interface{}{"kubernetes.io/metadata.name": "portal-test"}},
		"podSelector":       map[string]interface{}{"matchLabels": map[string]interface{}{"deployment": "gen-ai-ui"}},
	}}, egress[3].(map[string]interface{})["to"])
	assert.Equal(t, []interface{}{map[string]interface{}{"protocol": "TCP", "port": int64(8143)}}, egress[3].(map[string]interface{})["ports"])
	persesNetworkPolicy := resources["NetworkPolicy/"+maasPortalName+"-perses"]
	require.NotNil(t, persesNetworkPolicy)
	podSelector, found, err := unstructured.NestedStringMap(persesNetworkPolicy.Object, "spec", "podSelector", "matchLabels")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, map[string]string{"deployment": maasPortalName}, podSelector)
	policyTypes, found, err := unstructured.NestedStringSlice(persesNetworkPolicy.Object, "spec", "policyTypes")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, []string{"Egress"}, policyTypes)
	persesEgress, found, err := unstructured.NestedSlice(persesNetworkPolicy.Object, "spec", "egress")
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, persesEgress, 1)
	assert.Equal(t, []interface{}{map[string]interface{}{
		"namespaceSelector": map[string]interface{}{"matchLabels": map[string]interface{}{"kubernetes.io/metadata.name": "custom-perses"}},
		"podSelector":       map[string]interface{}{"matchLabels": map[string]interface{}{"app.kubernetes.io/managed-by": "perses-operator"}},
	}}, persesEgress[0].(map[string]interface{})["to"])
	assert.Equal(t, []interface{}{map[string]interface{}{"protocol": "TCP", "port": int64(8080)}}, persesEgress[0].(map[string]interface{})["ports"])
}

func TestFilterMaaSPortalResources(t *testing.T) {
	resources := []unstructured.Unstructured{
		{Object: map[string]interface{}{"kind": "Role", "metadata": map[string]interface{}{"name": "maas-portal-rhods-operator-subscription"}}},
		{Object: map[string]interface{}{"kind": "RoleBinding", "metadata": map[string]interface{}{"name": "maas-portal-rhods-operator-subscription"}}},
		{Object: map[string]interface{}{"kind": "Role", "metadata": map[string]interface{}{"name": "maas-portal-opendatahub-operator-subscription"}}},
		{Object: map[string]interface{}{"kind": "RoleBinding", "metadata": map[string]interface{}{"name": "maas-portal-opendatahub-operator-subscription"}}},
		{Object: map[string]interface{}{"kind": "Deployment", "metadata": map[string]interface{}{"name": maasPortalName}}},
	}

	filtered := filterMaaSPortalResources(resources, map[string]struct{}{"redhat-ods-operator": {}})

	require.Len(t, filtered, 3)
	assert.Equal(t, "maas-portal-rhods-operator-subscription", filtered[0].GetName())
	assert.Equal(t, "maas-portal-rhods-operator-subscription", filtered[1].GetName())
	assert.Equal(t, maasPortalName, filtered[2].GetName())
}

func assertOperatorSubscriptionRole(t *testing.T, resources map[string]*unstructured.Unstructured, namespace, subscriptionName string) {
	t.Helper()
	name := "maas-portal-" + subscriptionName + "-subscription"
	role := resources["Role/"+name+"/"+namespace]
	require.NotNil(t, role)
	assert.Equal(t, namespace, role.GetNamespace())
	rules, found, err := unstructured.NestedSlice(role.Object, "rules")
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, rules, 1)
	assert.Equal(t, []interface{}{"operators.coreos.com"}, rules[0].(map[string]interface{})["apiGroups"])
	assert.Equal(t, []interface{}{"subscriptions"}, rules[0].(map[string]interface{})["resources"])
	assert.Equal(t, []interface{}{subscriptionName}, rules[0].(map[string]interface{})["resourceNames"])
	assert.Equal(t, []interface{}{"get"}, rules[0].(map[string]interface{})["verbs"])

	binding := resources["RoleBinding/"+name+"/"+namespace]
	require.NotNil(t, binding)
	roleRef, found, err := unstructured.NestedStringMap(binding.Object, "roleRef")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, "Role", roleRef["kind"])
	assert.Equal(t, name, roleRef["name"])
	subjects, found, err := unstructured.NestedSlice(binding.Object, "subjects")
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, subjects, 1)
	assert.Equal(t, "portal-test", subjects[0].(map[string]interface{})["namespace"])
}

func namedManifestObject(t *testing.T, objects []interface{}, name string) map[string]interface{} {
	t.Helper()
	for _, object := range objects {
		item, ok := object.(map[string]interface{})
		if ok && item["name"] == name {
			return item
		}
	}

	require.FailNowf(t, "manifest object not found", "expected object named %q", name)
	return nil
}
