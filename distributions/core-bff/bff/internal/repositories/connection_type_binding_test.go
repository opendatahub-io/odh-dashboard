package repositories

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
	k8stesting "k8s.io/client-go/testing"
)

func boundCT(rv string) *corev1.ConfigMap {
	return &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{
		Name: "ct", Namespace: testNS, ResourceVersion: rv,
		Labels: map[string]string{models.LabelDashboardResource: "true", models.LabelConnectionType: "true"},
	}}
}

// Sweep of the validate-then-write class: every connection-type mutation is
// bound to the ConfigMap it validated, so a ConfigMap changed in between is a
// conflict at the API server, not an unchecked write.
func TestConnectionType_WritesBoundToValidatedRead(t *testing.T) {
	cs := fake.NewSimpleClientset(boundCT("7"))
	repo := NewConnectionTypeRepository(cs)
	ctx := context.Background()

	_, err := repo.Update(ctx, testNS, "ct", boundCT(""))
	require.NoError(t, err)
	_, err = repo.Patch(ctx, testNS, "ct", []byte(`[{"op":"add","path":"/data","value":{"k":"v"}}]`))
	require.NoError(t, err)
	_, err = repo.Delete(ctx, testNS, "ct")
	require.NoError(t, err)

	var sawUpdate, sawPatch, sawDelete bool
	for _, a := range cs.Actions() {
		switch act := a.(type) {
		case k8stesting.UpdateAction:
			sawUpdate = true
			assert.Equal(t, "7", act.GetObject().(*corev1.ConfigMap).ResourceVersion, "update carries the validated version")
		case k8stesting.PatchAction:
			sawPatch = true
			var ops []map[string]any
			require.NoError(t, json.Unmarshal(act.GetPatch(), &ops))
			require.Len(t, ops, 2)
			assert.Equal(t, map[string]any{"op": "test", "path": "/metadata/resourceVersion", "value": "7"}, ops[0])
		case k8stesting.DeleteActionImpl:
			sawDelete = true
			require.NotNil(t, act.DeleteOptions.Preconditions)
			assert.Equal(t, "7", *act.DeleteOptions.Preconditions.ResourceVersion)
		}
	}
	assert.True(t, sawUpdate && sawPatch && sawDelete)
}

func TestBoundJSONPatch_LeavesNonArrayBodiesAlone(t *testing.T) {
	for _, body := range []string{`{"op":"add"}`, `not json`, `[]`} {
		got := boundJSONPatch([]byte(body), "7")
		if body == "[]" {
			assert.JSONEq(t, `[{"op":"test","path":"/metadata/resourceVersion","value":"7"}]`, string(got))
			continue
		}
		assert.Equal(t, body, string(got))
	}
	assert.Equal(t, `[{"op":"add"}]`, string(boundJSONPatch([]byte(`[{"op":"add"}]`), "")))
}
