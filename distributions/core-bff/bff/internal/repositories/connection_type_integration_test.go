package repositories

import (
	"context"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

func ctConfigMap(name string) *corev1.ConfigMap {
	return &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: testNS,
			Labels: map[string]string{
				models.LabelDashboardResource: "true",
				models.LabelConnectionType:    "true",
			},
		},
		Data: map[string]string{"key": "value"},
	}
}

func plainConfigMap(name string) *corev1.ConfigMap {
	return &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: testNS,
		},
		Data: map[string]string{"key": "value"},
	}
}

func TestConnectionTypeList_WithItems(t *testing.T) {
	cs := fake.NewSimpleClientset(ctConfigMap("ct-1"), ctConfigMap("ct-2"))
	repo := NewConnectionTypeRepository(cs)

	items, err := repo.List(context.Background(), testNS)
	require.NoError(t, err)
	assert.Len(t, items, 2)
}

func TestConnectionTypeList_Empty(t *testing.T) {
	cs := fake.NewSimpleClientset()
	repo := NewConnectionTypeRepository(cs)

	items, err := repo.List(context.Background(), testNS)
	require.NoError(t, err)
	assert.Empty(t, items)
}

func TestConnectionTypeGet_Success(t *testing.T) {
	cs := fake.NewSimpleClientset(ctConfigMap("my-ct"))
	repo := NewConnectionTypeRepository(cs)

	cm, err := repo.Get(context.Background(), testNS, "my-ct")
	require.NoError(t, err)
	assert.Equal(t, "my-ct", cm.Name)
}

func TestConnectionTypeGet_NotConnectionType(t *testing.T) {
	cs := fake.NewSimpleClientset(plainConfigMap("plain"))
	repo := NewConnectionTypeRepository(cs)

	_, err := repo.Get(context.Background(), testNS, "plain")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not a connection type")
}

func TestConnectionTypeCreate_Success(t *testing.T) {
	cs := fake.NewSimpleClientset()
	repo := NewConnectionTypeRepository(cs)

	result, err := repo.Create(context.Background(), testNS, ctConfigMap("new-ct"))
	require.NoError(t, err)
	assert.True(t, result.Success)
}

func TestConnectionTypeCreate_InvalidLabels(t *testing.T) {
	cs := fake.NewSimpleClientset()
	repo := NewConnectionTypeRepository(cs)

	result, err := repo.Create(context.Background(), testNS, plainConfigMap("bad"))
	require.NoError(t, err)
	assert.False(t, result.Success)
	assert.Contains(t, result.Error, "connection-type labels")
}

func TestConnectionTypeUpdate_ValidatesExisting(t *testing.T) {
	cs := fake.NewSimpleClientset(ctConfigMap("existing"))
	repo := NewConnectionTypeRepository(cs)

	updated := ctConfigMap("existing")
	updated.Data["key"] = "updated"

	result, err := repo.Update(context.Background(), testNS, "existing", updated)
	require.NoError(t, err)
	assert.True(t, result.Success)
}

func TestConnectionTypeUpdate_RejectsNonConnectionType(t *testing.T) {
	cs := fake.NewSimpleClientset(plainConfigMap("plain"))
	repo := NewConnectionTypeRepository(cs)

	result, err := repo.Update(context.Background(), testNS, "plain", ctConfigMap("plain"))
	require.NoError(t, err)
	assert.False(t, result.Success)
	assert.Contains(t, result.Error, "not a connection type")
}

func TestConnectionTypePatch_ValidatesExisting(t *testing.T) {
	cs := fake.NewSimpleClientset(ctConfigMap("patch-me"))
	repo := NewConnectionTypeRepository(cs)

	patch := []byte(`[{"op":"replace","path":"/data/key","value":"patched"}]`)
	result, err := repo.Patch(context.Background(), testNS, "patch-me", patch)
	require.NoError(t, err)
	assert.True(t, result.Success)
}

func TestConnectionTypePatch_RejectsNonConnectionType(t *testing.T) {
	cs := fake.NewSimpleClientset(plainConfigMap("plain"))
	repo := NewConnectionTypeRepository(cs)

	patch := []byte(`{"data":{"key":"patched"}}`)
	result, err := repo.Patch(context.Background(), testNS, "plain", patch)
	require.NoError(t, err)
	assert.False(t, result.Success)
	assert.Contains(t, result.Error, "not a connection type")
}

func TestConnectionTypePatch_RejectsLabelRemoval(t *testing.T) {
	cs := fake.NewSimpleClientset(ctConfigMap("patch-labels"))
	repo := NewConnectionTypeRepository(cs)
	ctx := context.Background()

	patch := []byte(`[{"op":"remove","path":"/metadata/labels/opendatahub.io~1connection-type"}]`)
	result, err := repo.Patch(ctx, testNS, "patch-labels", patch)
	require.NoError(t, err)
	assert.False(t, result.Success)
	assert.Contains(t, result.Error, "connection-type labels")

	// Verify the object was reverted - labels should still be intact
	cm, err := cs.CoreV1().ConfigMaps(testNS).Get(ctx, "patch-labels", metav1.GetOptions{})
	require.NoError(t, err)
	assert.True(t, isConnectionTypeConfigMap(cm))
}

func TestConnectionTypeDelete_Success(t *testing.T) {
	cs := fake.NewSimpleClientset(ctConfigMap("del-me"))
	repo := NewConnectionTypeRepository(cs)

	result, err := repo.Delete(context.Background(), testNS, "del-me")
	require.NoError(t, err)
	assert.True(t, result.Success)
}

func TestConnectionTypeDelete_NonConnectionType(t *testing.T) {
	cs := fake.NewSimpleClientset(plainConfigMap("plain"))
	repo := NewConnectionTypeRepository(cs)

	result, err := repo.Delete(context.Background(), testNS, "plain")
	require.NoError(t, err)
	assert.False(t, result.Success)
	assert.Contains(t, result.Error, "not a connection type")
}
