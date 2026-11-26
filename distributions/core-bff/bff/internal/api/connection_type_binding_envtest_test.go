package api

import (
	"context"
	"net/http"
	"sync"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// afterFirstGet runs fn once, right after the first GET response, so a
// concurrent change lands between a repository's validation read and its write.
type afterFirstGet struct {
	next http.RoundTripper
	once sync.Once
	fn   func()
}

func (a *afterFirstGet) RoundTrip(r *http.Request) (*http.Response, error) {
	resp, err := a.next.RoundTrip(r)
	if err == nil && r.Method == http.MethodGet {
		a.once.Do(a.fn)
	}
	return resp, err
}

// Sweep of the validate-then-write class, against a real API server: a
// connection type changed between validation and the write is not written.
func TestConnectionType_ChangedAfterValidation_NotWritten_Envtest(t *testing.T) {
	ctx := context.Background()
	admin, err := kubernetes.NewForConfig(testEnvInstance.Config)
	require.NoError(t, err)
	ns := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{GenerateName: "ct-binding-"}}
	ns, err = admin.CoreV1().Namespaces().Create(ctx, ns, metav1.CreateOptions{})
	require.NoError(t, err)
	t.Cleanup(func() { _ = admin.CoreV1().Namespaces().Delete(ctx, ns.Name, metav1.DeleteOptions{}) })

	labels := map[string]string{models.LabelDashboardResource: "true", models.LabelConnectionType: "true"}
	newRepo := func(t *testing.T, name string) *repositories.ConnectionTypeRepository {
		t.Helper()
		_, err := admin.CoreV1().ConfigMaps(ns.Name).Create(ctx, &corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{Name: name, Labels: labels}, Data: map[string]string{"v": "1"},
		}, metav1.CreateOptions{})
		require.NoError(t, err)
		cfg := rest.CopyConfig(testEnvInstance.Config)
		cfg.WrapTransport = func(rt http.RoundTripper) http.RoundTripper {
			return &afterFirstGet{next: rt, fn: func() {
				cm, err := admin.CoreV1().ConfigMaps(ns.Name).Get(ctx, name, metav1.GetOptions{})
				require.NoError(t, err)
				cm.Data["v"] = "other admin"
				_, err = admin.CoreV1().ConfigMaps(ns.Name).Update(ctx, cm, metav1.UpdateOptions{})
				require.NoError(t, err)
			}}
		}
		cs, err := kubernetes.NewForConfig(cfg)
		require.NoError(t, err)
		return repositories.NewConnectionTypeRepository(cs)
	}
	stored := func(name string) *corev1.ConfigMap {
		cm, err := admin.CoreV1().ConfigMaps(ns.Name).Get(ctx, name, metav1.GetOptions{})
		require.NoError(t, err)
		return cm
	}

	t.Run("update", func(t *testing.T) {
		repo := newRepo(t, "ct-update")
		resp, err := repo.Update(ctx, ns.Name, "ct-update", &corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{Name: "ct-update", Namespace: ns.Name, Labels: labels}, Data: map[string]string{"v": "mine"},
		})
		require.NoError(t, err)
		assert.False(t, resp.Success)
		assert.Equal(t, "other admin", stored("ct-update").Data["v"])
	})
	t.Run("patch", func(t *testing.T) {
		repo := newRepo(t, "ct-patch")
		resp, err := repo.Patch(ctx, ns.Name, "ct-patch", []byte(`[{"op":"replace","path":"/data/v","value":"mine"}]`))
		require.NoError(t, err)
		assert.False(t, resp.Success)
		assert.Equal(t, "other admin", stored("ct-patch").Data["v"])
	})
	t.Run("delete", func(t *testing.T) {
		repo := newRepo(t, "ct-delete")
		resp, err := repo.Delete(ctx, ns.Name, "ct-delete")
		require.NoError(t, err)
		assert.False(t, resp.Success)
		assert.Equal(t, "other admin", stored("ct-delete").Data["v"], "not deleted")
	})
}
