package api

import (
	"io"
	"log/slog"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	k8sfake "k8s.io/client-go/kubernetes/fake"
	k8stesting "k8s.io/client-go/testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func TestQueryClusterBranding_Success(t *testing.T) {
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      consoleConfigName,
			Namespace: consoleConfigNamespace,
		},
		Data: map[string]string{
			consoleConfigKey: "customization:\n  branding: ocp\n",
		},
	}
	client := k8sfake.NewSimpleClientset(cm)
	branding := queryClusterBranding(client, testLogger())
	assert.Equal(t, "ocp", branding)
}

func TestQueryClusterBranding_NotFound(t *testing.T) {
	client := k8sfake.NewSimpleClientset()
	branding := queryClusterBranding(client, testLogger())
	assert.Equal(t, defaultClusterBranding, branding)
}

func TestQueryClusterBranding_MissingField(t *testing.T) {
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      consoleConfigName,
			Namespace: consoleConfigNamespace,
		},
		Data: map[string]string{
			consoleConfigKey: "someOtherKey: value\n",
		},
	}
	client := k8sfake.NewSimpleClientset(cm)
	branding := queryClusterBranding(client, testLogger())
	assert.Equal(t, defaultClusterBranding, branding)
}

func TestQueryClusterBranding_MissingConfigKey(t *testing.T) {
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      consoleConfigName,
			Namespace: consoleConfigNamespace,
		},
		Data: map[string]string{
			"other-key": "value",
		},
	}
	client := k8sfake.NewSimpleClientset(cm)
	branding := queryClusterBranding(client, testLogger())
	assert.Equal(t, defaultClusterBranding, branding)
}

func TestQueryClusterID_Success(t *testing.T) {
	cv := &unstructured.Unstructured{
		Object: map[string]any{
			"apiVersion": "config.openshift.io/v1",
			"kind":       "ClusterVersion",
			"metadata": map[string]any{
				"name": clusterVersionName,
			},
			"spec": map[string]any{
				"clusterID": "test-cluster-id-123",
			},
		},
	}

	scheme := runtime.NewScheme()
	dynClient := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(scheme,
		map[schema.GroupVersionResource]string{
			clusterVersionGVR: "ClusterVersionList",
		}, cv)

	clusterID, err := queryClusterID(dynClient, testLogger())
	require.NoError(t, err)
	assert.Equal(t, "test-cluster-id-123", clusterID)
}

func TestQueryClusterID_NotFound(t *testing.T) {
	scheme := runtime.NewScheme()
	dynClient := dynamicfake.NewSimpleDynamicClient(scheme)
	clusterID, err := queryClusterID(dynClient, testLogger())
	require.NoError(t, err)
	assert.Equal(t, "", clusterID)
}

func TestQueryClusterID_NilClient(t *testing.T) {
	clusterID, err := queryClusterID(nil, testLogger())
	require.NoError(t, err)
	assert.Equal(t, "", clusterID)
}

func TestQueryClusterID_ForbiddenReturnsError(t *testing.T) {
	scheme := runtime.NewScheme()
	dynClient := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(scheme,
		map[schema.GroupVersionResource]string{
			clusterVersionGVR: "ClusterVersionList",
		})
	dynClient.PrependReactor("get", "clusterversions", func(action k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewForbidden(
			schema.GroupResource{Group: "config.openshift.io", Resource: "clusterversions"},
			clusterVersionName, nil,
		)
	})

	clusterID, err := queryClusterID(dynClient, testLogger())
	assert.Error(t, err)
	assert.Equal(t, "", clusterID)
	assert.Contains(t, err.Error(), "ClusterVersion probe failed")
}

func TestResolveStartupPlatform_ProbeError_DefaultsToOpenShift(t *testing.T) {
	ci := clusterInfo{}
	probeErr := k8serrors.NewForbidden(
		schema.GroupResource{Group: "config.openshift.io", Resource: "clusterversions"},
		clusterVersionName, nil,
	)
	result := resolveStartupPlatform(ci, probeErr, false, "", testLogger())
	assert.Equal(t, config.PlatformOpenShift, result)
}

func TestResolveStartupPlatform_NoError_DetectsXKS(t *testing.T) {
	ci := clusterInfo{}
	result := resolveStartupPlatform(ci, nil, false, "", testLogger())
	assert.Equal(t, config.PlatformXKS, result)
}

func TestResolveStartupPlatform_ExplicitOverridesProbeError(t *testing.T) {
	ci := clusterInfo{}
	probeErr := k8serrors.NewForbidden(
		schema.GroupResource{Group: "config.openshift.io", Resource: "clusterversions"},
		clusterVersionName, nil,
	)
	result := resolveStartupPlatform(ci, probeErr, true, config.PlatformXKS, testLogger())
	assert.Equal(t, config.PlatformXKS, result)
}

func TestQueryClusterInfo_BothFail(t *testing.T) {
	typedClient := k8sfake.NewSimpleClientset()
	scheme := runtime.NewScheme()
	dynClient := dynamicfake.NewSimpleDynamicClient(scheme)

	info, err := queryClusterInfo(typedClient, dynClient, testLogger())
	require.NoError(t, err)
	assert.Equal(t, "", info.clusterID)
	assert.Equal(t, defaultClusterBranding, info.clusterBranding)
}

func TestQueryClusterInfo_BothSucceed(t *testing.T) {
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      consoleConfigName,
			Namespace: consoleConfigNamespace,
		},
		Data: map[string]string{
			consoleConfigKey: "customization:\n  branding: dedicated\n",
		},
	}
	typedClient := k8sfake.NewSimpleClientset(cm)

	cv := &unstructured.Unstructured{
		Object: map[string]any{
			"apiVersion": "config.openshift.io/v1",
			"kind":       "ClusterVersion",
			"metadata": map[string]any{
				"name": clusterVersionName,
			},
			"spec": map[string]any{
				"clusterID": "abc-def-ghi",
			},
		},
	}
	scheme := runtime.NewScheme()
	dynClient := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(scheme,
		map[schema.GroupVersionResource]string{
			clusterVersionGVR: "ClusterVersionList",
		}, cv)

	info, err := queryClusterInfo(typedClient, dynClient, testLogger())
	require.NoError(t, err)
	assert.Equal(t, "abc-def-ghi", info.clusterID)
	assert.Equal(t, "dedicated", info.clusterBranding)
}
