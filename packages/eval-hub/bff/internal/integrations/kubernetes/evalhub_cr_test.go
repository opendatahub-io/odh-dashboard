package kubernetes

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	k8stesting "k8s.io/client-go/testing"
)

func newEvalHubCRTestClient(t *testing.T, objects ...runtime.Object) *dynamicfake.FakeDynamicClient {
	t.Helper()

	gvrToListKind := map[schema.GroupVersionResource]string{}
	for _, gvr := range EvalHubGVRs {
		gvrToListKind[gvr] = "EvalHubList"
	}
	return dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), gvrToListKind, objects...)
}

func evalHubCR(name, namespace string, gvr schema.GroupVersionResource) *unstructured.Unstructured {
	cr := &unstructured.Unstructured{}
	cr.SetGroupVersionKind(schema.GroupVersionKind{Group: gvr.Group, Version: gvr.Version, Kind: "EvalHub"})
	cr.SetName(name)
	cr.SetNamespace(namespace)
	return cr
}

// failEvalHubVersion prepends a reactor that fails list calls for the given API version.
func failEvalHubVersion(client *dynamicfake.FakeDynamicClient, version string, err error) {
	client.PrependReactor("list", "evalhubs", func(action k8stesting.Action) (bool, runtime.Object, error) {
		if action.GetResource().Version == version {
			return true, nil, err
		}
		return false, nil, nil
	})
}

// listedEvalHubVersions returns the API versions of the recorded evalhubs list calls.
func listedEvalHubVersions(client *dynamicfake.FakeDynamicClient) []string {
	versions := []string{}
	for _, action := range client.Actions() {
		if action.GetVerb() == "list" && action.GetResource().Resource == "evalhubs" {
			versions = append(versions, action.GetResource().Version)
		}
	}
	return versions
}

func TestListEvalHubCRsPrefersV1(t *testing.T) {
	client := newEvalHubCRTestClient(t,
		evalHubCR("evalhub", "test-ns", EvalHubGVR),
		evalHubCR("evalhub", "test-ns", EvalHubLegacyGVR),
	)

	list, err := listEvalHubCRs(context.Background(), client, "test-ns")

	require.NoError(t, err)
	require.Len(t, list.Items, 1)
	assert.Equal(t, EvalHubCRDVersion, list.Items[0].GroupVersionKind().Version)
	// v1alpha1 must never be queried when v1 is served: on current operators it
	// traverses the conversion webhook.
	assert.Equal(t, []string{EvalHubCRDVersion}, listedEvalHubVersions(client))
}

func TestListEvalHubCRsFallsBackToV1alpha1WhenV1NotServed(t *testing.T) {
	client := newEvalHubCRTestClient(t, evalHubCR("evalhub", "test-ns", EvalHubLegacyGVR))
	failEvalHubVersion(client, EvalHubCRDVersion,
		k8serrors.NewNotFound(EvalHubGVR.GroupResource(), EvalHubCRDVersion))

	list, err := listEvalHubCRs(context.Background(), client, "test-ns")

	require.NoError(t, err)
	require.Len(t, list.Items, 1)
	assert.Equal(t, EvalHubCRDLegacyVersion, list.Items[0].GroupVersionKind().Version)
	assert.Equal(t, []string{EvalHubCRDVersion, EvalHubCRDLegacyVersion}, listedEvalHubVersions(client))
}

func TestListEvalHubCRsSurfacesOperationalErrorsImmediately(t *testing.T) {
	client := newEvalHubCRTestClient(t)
	failEvalHubVersion(client, EvalHubCRDVersion,
		k8serrors.NewForbidden(EvalHubGVR.GroupResource(), "", fmt.Errorf("user cannot list evalhubs")))

	_, err := listEvalHubCRs(context.Background(), client, "test-ns")

	require.Error(t, err)
	assert.True(t, k8serrors.IsForbidden(err))
	// Operational errors (RBAC etc.) must not be masked by the fallback.
	assert.Equal(t, []string{EvalHubCRDVersion}, listedEvalHubVersions(client))
}

// Objects created before the v1 promotion remain stored as v1alpha1: listing
// them at v1 goes through the conversion webhook, so an unavailable webhook
// fails the v1 list even though the v1alpha1 list would be served directly.
// These failures must fall through to the legacy version.
func TestListEvalHubCRsFallsBackOnConversionFailures(t *testing.T) {
	tests := []struct {
		name string
		err  error
	}{
		{
			name: "internal error from a failed conversion webhook call",
			err: k8serrors.NewInternalError(fmt.Errorf(
				"failed calling webhook \"%s.convert\": connection refused", EvalHubCRDResource)),
		},
		{
			name: "service unavailable",
			err:  k8serrors.NewServiceUnavailable("conversion webhook call failed"),
		},
		{
			name: "request timeout while calling the webhook",
			err:  context.DeadlineExceeded,
		},
		{
			name: "error message mentioning the conversion webhook",
			err:  fmt.Errorf("conversion webhook for evalhubs.trustyai.opendatahub.io failed"),
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := newEvalHubCRTestClient(t, evalHubCR("evalhub", "test-ns", EvalHubLegacyGVR))
			failEvalHubVersion(client, EvalHubCRDVersion, tt.err)

			list, err := listEvalHubCRs(context.Background(), client, "test-ns")

			require.NoError(t, err)
			require.Len(t, list.Items, 1)
			assert.Equal(t, EvalHubCRDLegacyVersion, list.Items[0].GroupVersionKind().Version)
			assert.Equal(t, []string{EvalHubCRDVersion, EvalHubCRDLegacyVersion}, listedEvalHubVersions(client))
		})
	}
}

func TestListEvalHubCRsReturnsErrorWhenNoVersionServed(t *testing.T) {
	client := newEvalHubCRTestClient(t)
	failEvalHubVersion(client, EvalHubCRDVersion,
		k8serrors.NewNotFound(EvalHubGVR.GroupResource(), EvalHubCRDVersion))
	failEvalHubVersion(client, EvalHubCRDLegacyVersion,
		k8serrors.NewNotFound(EvalHubLegacyGVR.GroupResource(), EvalHubCRDLegacyVersion))

	_, err := listEvalHubCRs(context.Background(), client, "test-ns")

	require.Error(t, err)
	assert.True(t, k8serrors.IsNotFound(err))
	assert.Equal(t, []string{EvalHubCRDVersion, EvalHubCRDLegacyVersion}, listedEvalHubVersions(client))
}
