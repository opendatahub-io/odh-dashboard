package api

import (
	"io"
	"log/slog"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
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

func clusterVersionObject(spec map[string]any) *unstructured.Unstructured {
	obj := map[string]any{
		"apiVersion": "config.openshift.io/v1",
		"kind":       "ClusterVersion",
		"metadata": map[string]any{
			"name": clusterVersionName,
		},
	}
	if spec != nil {
		obj["spec"] = spec
	}
	return &unstructured.Unstructured{Object: obj}
}

func clusterVersionClient(objs ...runtime.Object) *dynamicfake.FakeDynamicClient {
	return dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(),
		map[schema.GroupVersionResource]string{
			models.ClusterVersionGVR: "ClusterVersionList",
		}, objs...)
}

func TestQueryClusterVersion_Success(t *testing.T) {
	dynClient := clusterVersionClient(clusterVersionObject(map[string]any{"clusterID": "test-cluster-id-123"}))

	probe, err := queryClusterVersion(dynClient, testLogger())
	require.NoError(t, err)
	assert.Equal(t, clusterVersionFound, probe.outcome)
	assert.Equal(t, "test-cluster-id-123", probe.clusterID)
}

// A ClusterVersion object that was read establishes OpenShift even when its
// cluster ID is missing or malformed: the ID is metadata, not the platform.
func TestQueryClusterVersion_FoundWithoutUsableClusterID(t *testing.T) {
	for name, spec := range map[string]map[string]any{
		"no spec":           nil,
		"empty spec":        {},
		"non-string ID":     {"clusterID": int64(42)},
		"empty string ID":   {"clusterID": ""},
		"spec is not a map": {"unused": true},
	} {
		t.Run(name, func(t *testing.T) {
			obj := clusterVersionObject(spec)
			if name == "spec is not a map" {
				obj.Object["spec"] = "malformed"
			}
			probe, err := queryClusterVersion(clusterVersionClient(obj), testLogger())
			require.NoError(t, err)
			assert.Equal(t, clusterVersionFound, probe.outcome)
			assert.Empty(t, probe.clusterID)
		})
	}
}

// Discovery absence (404 without a resource name) is the only probe outcome
// that positively identifies a non-OpenShift cluster.
func TestQueryClusterVersion_APIAbsent(t *testing.T) {
	dynClient := clusterVersionClient()
	dynClient.PrependReactor("get", "clusterversions", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, &k8serrors.StatusError{ErrStatus: metav1.Status{
			Status: metav1.StatusFailure, Code: 404, Reason: metav1.StatusReasonNotFound,
		}}
	})

	probe, err := queryClusterVersion(dynClient, testLogger())
	require.NoError(t, err)
	assert.Equal(t, clusterVersionAPIAbsent, probe.outcome)
}

// The API is served but the singleton is missing: that does not show the
// cluster is not OpenShift, so the probe is inconclusive.
func TestQueryClusterVersion_InstanceMissingIsInconclusive(t *testing.T) {
	probe, err := queryClusterVersion(clusterVersionClient(), testLogger())
	require.Error(t, err)
	assert.ErrorIs(t, err, errClusterVersionInstanceMissing)
	assert.Zero(t, probe.outcome)
}

func TestQueryClusterVersion_NilClientIsInconclusive(t *testing.T) {
	_, err := queryClusterVersion(nil, testLogger())
	require.Error(t, err)
}

func TestQueryClusterVersion_ForbiddenReturnsError(t *testing.T) {
	dynClient := clusterVersionClient()
	dynClient.PrependReactor("get", "clusterversions", func(action k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewForbidden(
			schema.GroupResource{Group: "config.openshift.io", Resource: "clusterversions"},
			clusterVersionName, nil,
		)
	})

	probe, err := queryClusterVersion(dynClient, testLogger())
	assert.Error(t, err)
	assert.Empty(t, probe.clusterID)
	assert.Contains(t, err.Error(), "ClusterVersion probe failed")
}

func TestResolveStartupPlatform_ProbeError_DefaultsToXKS(t *testing.T) {
	ci := clusterInfo{}
	probeErr := k8serrors.NewForbidden(
		schema.GroupResource{Group: "config.openshift.io", Resource: "clusterversions"},
		clusterVersionName, nil,
	)
	result, _ := resolveStartupPlatform(ci, probeErr, false, "", testLogger())
	assert.Equal(t, config.PlatformXKS, result)
}

func TestResolveStartupPlatform_NoError_DetectsXKS(t *testing.T) {
	ci := clusterInfo{}
	result, _ := resolveStartupPlatform(ci, nil, false, "", testLogger())
	assert.Equal(t, config.PlatformXKS, result)
}

func TestResolveStartupPlatform_ExplicitOverridesProbeError(t *testing.T) {
	ci := clusterInfo{}
	probeErr := k8serrors.NewForbidden(
		schema.GroupResource{Group: "config.openshift.io", Resource: "clusterversions"},
		clusterVersionName, nil,
	)
	result, _ := resolveStartupPlatform(ci, probeErr, true, config.PlatformXKS, testLogger())
	assert.Equal(t, config.PlatformXKS, result)
}

func TestResolveStartupPlatform_ExplicitOpenShift_MismatchDetected(t *testing.T) {
	ci := clusterInfo{}
	result, _ := resolveStartupPlatform(ci, nil, true, config.PlatformOpenShift, testLogger())
	assert.Equal(t, config.PlatformOpenShift, result)
}

func TestResolveStartupPlatform_ExplicitOpenShift_MatchesProbe(t *testing.T) {
	ci := clusterInfo{clusterID: "real-cluster-id"}
	result, _ := resolveStartupPlatform(ci, nil, true, config.PlatformOpenShift, testLogger())
	assert.Equal(t, config.PlatformOpenShift, result)
}

func TestResolveStartupPlatform_ExplicitXKS_NoProbeError(t *testing.T) {
	ci := clusterInfo{clusterID: "real-cluster-id"}
	result, _ := resolveStartupPlatform(ci, nil, true, config.PlatformXKS, testLogger())
	assert.Equal(t, config.PlatformXKS, result)
}

func TestResolveStartupPlatform_AutoDetect_OpenShift(t *testing.T) {
	ci := clusterInfo{clusterID: "abc-123"}
	result, _ := resolveStartupPlatform(ci, nil, false, "", testLogger())
	assert.Equal(t, config.PlatformOpenShift, result)
}

func TestQueryClusterInfo_InstanceMissingIsAnError(t *testing.T) {
	typedClient := k8sfake.NewSimpleClientset()
	dynClient := dynamicfake.NewSimpleDynamicClient(runtime.NewScheme())

	info, err := queryClusterInfo(typedClient, dynClient, testLogger())
	require.Error(t, err, "a missing ClusterVersion instance is inconclusive, not evidence of xKS")
	assert.Equal(t, "", info.clusterID)
	assert.False(t, info.openShiftConfirmed)
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
			models.ClusterVersionGVR: "ClusterVersionList",
		}, cv)

	info, err := queryClusterInfo(typedClient, dynClient, testLogger())
	require.NoError(t, err)
	assert.Equal(t, "abc-def-ghi", info.clusterID)
	assert.True(t, info.openShiftConfirmed)
	assert.Equal(t, "dedicated", info.clusterBranding)
}
