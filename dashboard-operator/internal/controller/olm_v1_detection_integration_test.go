//go:build integration

package controller_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
)

// These tests exercise OLM v1 platform detection (RHOAIENG-95173) against a real
// ClusterExtension CRD in envtest. On OLM v1 clusters the operator install
// lifecycle is represented by a ClusterExtension instead of an OLM Classic
// Subscription/CSV, and DetectPlatform (odh-platform-utilities v0.4.0+) must
// resolve the platform from it. The ClusterExtension CRD is registered via
// testdata/crd; the OLM v0 CRDs (CatalogSource/OperatorCondition) and the
// ClusterCatalog CRD are intentionally absent, matching an OLM-v1-only cluster.

var clusterExtensionGVK = schema.GroupVersionKind{
	Group:   "olm.operatorframework.io",
	Version: "v1",
	Kind:    "ClusterExtension",
}

func newClusterExtension(name, packageName, namespace string) *unstructured.Unstructured {
	ce := &unstructured.Unstructured{}
	ce.SetGroupVersionKind(clusterExtensionGVK)
	ce.SetName(name)
	// spec.source.sourceType / catalog.packageName identify the operator; spec.namespace
	// is the install namespace. serviceAccount.name mirrors a real ClusterExtension.
	_ = unstructured.SetNestedField(ce.Object, "Catalog", "spec", "source", "sourceType")
	_ = unstructured.SetNestedField(ce.Object, packageName, "spec", "source", "catalog", "packageName")
	_ = unstructured.SetNestedField(ce.Object, namespace, "spec", "namespace")
	_ = unstructured.SetNestedField(ce.Object, "dashboard-operator-test", "spec", "serviceAccount", "name")
	return ce
}

func TestIntegration_DetectPlatformOLMv1(t *testing.T) {
	ctx := context.Background()

	t.Run("detects Self-Managed RHOAI from a rhods-operator ClusterExtension", func(t *testing.T) {
		ce := newClusterExtension("rhods", "rhods-operator", "redhat-ods-operator")
		require.NoError(t, k8sClient.Create(ctx, ce))
		t.Cleanup(func() { _ = k8sClient.Delete(ctx, ce) })

		platform, err := cluster.DetectPlatform(ctx, k8sClient, "", "")
		require.NoError(t, err)
		require.Equal(t, cluster.SelfManagedRhoai, platform)
	})

	t.Run("detects OpenDataHub when no rhods-operator ClusterExtension is present", func(t *testing.T) {
		ce := newClusterExtension("odh", "opendatahub-operator", "opendatahub-operator-system")
		require.NoError(t, k8sClient.Create(ctx, ce))
		t.Cleanup(func() { _ = k8sClient.Delete(ctx, ce) })

		platform, err := cluster.DetectPlatform(ctx, k8sClient, "", "")
		require.NoError(t, err)
		require.Equal(t, cluster.OpenDataHub, platform)
	})
}
