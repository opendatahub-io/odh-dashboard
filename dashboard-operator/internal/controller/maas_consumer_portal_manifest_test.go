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
	maasConsumerPortalName         = "maas-consumer-portal"
	maasConsumerPortalCoreBFFImage = "registry.example.com/odh-core-bff@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
)

func TestRenderMaaSConsumerPortalManifestBundle(t *testing.T) {
	// Render a copy of the checked-in bundle: reconciliation writes params.env at
	// runtime, so rendering the source directory directly would mutate the worktree.
	source := filepath.Join("..", "..", "..", "manifests", "distributions", maasConsumerPortalName)
	dir := filepath.Join(t.TempDir(), maasConsumerPortalName)
	require.NoError(t, os.CopyFS(dir, os.DirFS(source)))

	params := readExistingParams(filepath.Join(dir, "params.env"))
	params["core-bff-image"] = maasConsumerPortalCoreBFFImage
	params["dashboard-namespace"] = "portal-test"
	params["gateway-name"] = "portal-gateway"
	params["maas-consumer-portal-url"] = "https://portal.apps.example.com/"
	params["maas-consumer-portal-federation-config"] = "maas-consumer-portal-federation-test"
	params["maas-consumer-portal-hostname"] = "portal.apps.example.com"
	params["section-title"] = "OpenShift Self Managed Services"
	require.NoError(t, writeParamsEnv(dir, params))

	engine := kustomize.NewEngine()
	rendered, err := engine.Render(dir, kustomize.WithNamespace("portal-test"))
	require.NoError(t, err)
	require.Len(t, rendered, 9, "bundle must render its eight operand resources and params ConfigMap")

	resources := make(map[string]*unstructured.Unstructured, len(rendered))
	for i := range rendered {
		resource := &rendered[i]
		resources[resource.GetKind()+"/"+resource.GetName()] = resource
		assert.Equal(t, maasConsumerPortalName, resource.GetLabels()["app.kubernetes.io/component"])
		assert.Equal(t, maasConsumerPortalName, resource.GetLabels()["app.kubernetes.io/part-of"])
		assert.Equal(t, maasConsumerPortalName, resource.GetLabels()["platform.opendatahub.io/part-of"])
	}

	deployment := resources["Deployment/"+maasConsumerPortalName]
	require.NotNil(t, deployment)
	replicas, found, err := unstructured.NestedInt64(deployment.Object, "spec", "replicas")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, int64(1), replicas)

	podLabels, found, err := unstructured.NestedStringMap(deployment.Object, "spec", "template", "metadata", "labels")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, maasConsumerPortalName, podLabels["deployment"])
	assert.Equal(t, maasConsumerPortalName, podLabels["app.kubernetes.io/component"])
	assert.Equal(t, maasConsumerPortalName, podLabels["app.kubernetes.io/part-of"])
	assert.Equal(t, maasConsumerPortalName, podLabels["platform.opendatahub.io/part-of"])

	serviceAccount, found, err := unstructured.NestedString(deployment.Object, "spec", "template", "spec", "serviceAccountName")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, maasConsumerPortalName, serviceAccount)
	automount, found, err := unstructured.NestedBool(deployment.Object, "spec", "template", "spec", "automountServiceAccountToken")
	require.NoError(t, err)
	require.True(t, found)
	assert.False(t, automount)

	containers, found, err := unstructured.NestedSlice(deployment.Object, "spec", "template", "spec", "containers")
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, containers, 1)
	container := containers[0].(map[string]interface{})
	assert.Equal(t, maasConsumerPortalCoreBFFImage, container["image"])
	assert.Contains(t, container["args"], "--deployment-mode=standalone")
	assert.Contains(t, container["args"], "--platform-type=OpenShift")
	assert.Contains(t, container["args"], "--namespace=portal-test")
	assert.Contains(t, container["args"], "--static-assets-dir=/static/maas-consumer-portal")
	assert.Contains(t, container["args"], "--mf-remotes-config=/etc/odh-dashboard/maas-consumer-portal-federation-config.json")
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
	assert.Equal(t, "/etc/odh-dashboard", namedManifestObject(t, volumeMounts, "maas-consumer-portal-federation-config")["mountPath"])
	assert.Equal(t, "/var/run/secrets/kubernetes.io/serviceaccount", namedManifestObject(t, volumeMounts, "portal-sa-token")["mountPath"])

	volumes, found, err := unstructured.NestedSlice(deployment.Object, "spec", "template", "spec", "volumes")
	require.NoError(t, err)
	require.True(t, found)
	federationVolume := namedManifestObject(t, volumes, "maas-consumer-portal-federation-config")
	federationConfigMap := federationVolume["configMap"].(map[string]interface{})
	assert.Equal(t, "maas-consumer-portal-federation-test", federationConfigMap["name"])
	require.NotNil(t, namedManifestObject(t, volumes, "portal-tls")["secret"])
	require.NotNil(t, namedManifestObject(t, volumes, "portal-sa-token")["projected"])

	service := resources["Service/"+maasConsumerPortalName]
	require.NotNil(t, service)
	assert.Equal(t, maasConsumerPortalName+"-tls", service.GetAnnotations()["service.beta.openshift.io/serving-cert-secret-name"])
	assert.Equal(t, "HTTPS", service.GetAnnotations()["service.beta.kubernetes.io/backend-protocol"])

	route := resources["HTTPRoute/"+maasConsumerPortalName]
	require.NotNil(t, route)
	hostnames, found, err := unstructured.NestedStringSlice(route.Object, "spec", "hostnames")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, []string{"portal.apps.example.com"}, hostnames)
	parentRefs, found, err := unstructured.NestedSlice(route.Object, "spec", "parentRefs")
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, parentRefs, 1)
	gatewayName := parentRefs[0].(map[string]interface{})["name"]
	assert.Equal(t, "portal-gateway", gatewayName)

	consoleLink := resources["ConsoleLink/"+maasConsumerPortalName+"-link"]
	require.NotNil(t, consoleLink)
	href, found, err := unstructured.NestedString(consoleLink.Object, "spec", "href")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, "https://portal.apps.example.com/", href)

	roleBinding := resources["ClusterRoleBinding/"+maasConsumerPortalName]
	require.NotNil(t, roleBinding)
	subjects, found, err := unstructured.NestedSlice(roleBinding.Object, "subjects")
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, subjects, 1)
	subjectNamespace := subjects[0].(map[string]interface{})["namespace"]
	assert.Equal(t, "portal-test", subjectNamespace)
	role := resources["ClusterRole/"+maasConsumerPortalName]
	require.NotNil(t, role)
	rules, found, err := unstructured.NestedSlice(role.Object, "rules")
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, rules, 2, "portal RBAC is limited to DSC and ingress discovery")
	assert.Equal(t, []interface{}{"datasciencecluster.opendatahub.io"}, rules[0].(map[string]interface{})["apiGroups"])
	assert.Equal(t, []interface{}{"datascienceclusters"}, rules[0].(map[string]interface{})["resources"])
	assert.Equal(t, []interface{}{"get", "list"}, rules[0].(map[string]interface{})["verbs"])
	assert.Equal(t, []interface{}{"config.openshift.io"}, rules[1].(map[string]interface{})["apiGroups"])
	assert.Equal(t, []interface{}{"ingresses"}, rules[1].(map[string]interface{})["resources"])
	assert.Equal(t, []interface{}{"get"}, rules[1].(map[string]interface{})["verbs"])

	networkPolicy := resources["NetworkPolicy/"+maasConsumerPortalName]
	require.NotNil(t, networkPolicy)
	egress, found, err := unstructured.NestedSlice(networkPolicy.Object, "spec", "egress")
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, egress, 4, "portal egress is limited to DNS, Kubernetes API, MaaS, and GenAI")
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
