package api

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	k8serr "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sclient "k8s.io/client-go/kubernetes"
)

func ensureNamespace(t *testing.T, name string) {
	t.Helper()
	if testEnvInstance == nil || testEnvInstance.Config == nil {
		t.Fatal("testEnvInstance not initialized")
	}
	clientset, err := k8sclient.NewForConfig(testEnvInstance.Config)
	require.NoError(t, err)

	nsObj := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{Name: name},
	}
	_, err = clientset.CoreV1().Namespaces().Create(context.Background(), nsObj, metav1.CreateOptions{})
	if err != nil && !k8serr.IsAlreadyExists(err) {
		t.Fatalf("unexpected error creating namespace: %v", err)
	}
}

func TestNamespaceMutation_Context0_Returns400(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/namespaces/test-ns/0", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{
		{Key: "name", Value: "test-ns"},
		{Key: "context", Value: "0"},
	}
	app.NamespaceMutationHandler(rr, req, ps)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestNamespaceMutation_InvalidContext_Returns400(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	tests := []struct {
		name    string
		context string
	}{
		{"context 5", "5"},
		{"context -1", "-1"},
		{"non-integer", "abc"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rr := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, "/api/namespaces/test-ns/"+tt.context, nil)
			req = reqWithIdentity(req, &k8s.RequestIdentity{
				UserID: admin.UserName,
				Groups: admin.Groups,
				Token:  k8s.NewBearerToken(admin.Token),
			})

			ps := httprouter.Params{
				{Key: "name", Value: "test-ns"},
				{Key: "context", Value: tt.context},
			}
			app.NamespaceMutationHandler(rr, req, ps)

			assert.Equal(t, http.StatusBadRequest, rr.Code)
		})
	}
}

func TestNamespaceMutation_SystemNamespace_Returns400(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	tests := []struct {
		name      string
		namespace string
	}{
		{"openshift prefix", "openshift-monitoring"},
		{"kube prefix", "kube-system"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rr := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, "/api/namespaces/"+tt.namespace+"/1", nil)
			req = reqWithIdentity(req, &k8s.RequestIdentity{
				UserID: admin.UserName,
				Groups: admin.Groups,
				Token:  k8s.NewBearerToken(admin.Token),
			})

			ps := httprouter.Params{
				{Key: "name", Value: tt.namespace},
				{Key: "context", Value: "1"},
			}
			app.NamespaceMutationHandler(rr, req, ps)

			assert.Equal(t, http.StatusBadRequest, rr.Code)
		})
	}
}

func TestNamespaceMutation_SSARDenied_Returns403(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.kubernetesClientFactory = &deniedAccessFactory{}
	})

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/namespaces/my-ns/1", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: "denied-user",
		Token:  k8s.NewBearerToken("FAKE_TOKEN"),
	})

	ps := httprouter.Params{
		{Key: "name", Value: "my-ns"},
		{Key: "context", Value: "1"},
	}
	app.NamespaceMutationHandler(rr, req, ps)

	assert.Equal(t, http.StatusForbidden, rr.Code)
}

func TestNamespaceMutation_KServePromotion_Success(t *testing.T) {
	const ns = "ns-kserve-promo"
	ensureNamespace(t, ns)

	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/namespaces/"+ns+"/1", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{
		{Key: "name", Value: ns},
		{Key: "context", Value: "1"},
	}
	app.NamespaceMutationHandler(rr, req, ps)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), `"applied":true`)

	clientset, err := k8sclient.NewForConfig(testEnvInstance.Config)
	require.NoError(t, err)
	nsObj, err := clientset.CoreV1().Namespaces().Get(context.Background(), ns, metav1.GetOptions{})
	require.NoError(t, err)
	assert.Equal(t, "false", nsObj.Labels["modelmesh-enabled"])
}

func TestNamespaceMutation_KServeNIMPromotion_Success(t *testing.T) {
	const ns = "ns-nim-promo"
	ensureNamespace(t, ns)

	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/namespaces/"+ns+"/2", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{
		{Key: "name", Value: ns},
		{Key: "context", Value: "2"},
	}
	app.NamespaceMutationHandler(rr, req, ps)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), `"applied":true`)

	clientset, err := k8sclient.NewForConfig(testEnvInstance.Config)
	require.NoError(t, err)
	nsObj, err := clientset.CoreV1().Namespaces().Get(context.Background(), ns, metav1.GetOptions{})
	require.NoError(t, err)
	assert.Equal(t, "true", nsObj.Annotations["opendatahub.io/nim-support"])
}

func TestNamespaceMutation_Reset_Success(t *testing.T) {
	const ns = "ns-reset"
	ensureNamespace(t, ns)

	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	// First set the labels/annotations via context 1 and 2
	for _, ctx := range []string{"1", "2"} {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/namespaces/"+ns+"/"+ctx, nil)
		req = reqWithIdentity(req, &k8s.RequestIdentity{
			UserID: admin.UserName,
			Groups: admin.Groups,
			Token:  k8s.NewBearerToken(admin.Token),
		})
		ps := httprouter.Params{
			{Key: "name", Value: ns},
			{Key: "context", Value: ctx},
		}
		app.NamespaceMutationHandler(rr, req, ps)
		require.Equal(t, http.StatusOK, rr.Code)
	}

	// Now reset
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/namespaces/"+ns+"/3", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{
		{Key: "name", Value: ns},
		{Key: "context", Value: "3"},
	}
	app.NamespaceMutationHandler(rr, req, ps)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), `"applied":true`)

	clientset, err := k8sclient.NewForConfig(testEnvInstance.Config)
	require.NoError(t, err)
	nsObj, err := clientset.CoreV1().Namespaces().Get(context.Background(), ns, metav1.GetOptions{})
	require.NoError(t, err)
	_, hasLabel := nsObj.Labels["modelmesh-enabled"]
	assert.False(t, hasLabel, "modelmesh-enabled label should be removed")
	_, hasAnnotation := nsObj.Annotations["opendatahub.io/nim-support"]
	assert.False(t, hasAnnotation, "nim-support annotation should be removed")
}

func TestNamespaceMutation_DryRun(t *testing.T) {
	const ns = "ns-dryrun"
	ensureNamespace(t, ns)

	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/namespaces/"+ns+"/1?dryRun=All", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{
		{Key: "name", Value: ns},
		{Key: "context", Value: "1"},
	}
	app.NamespaceMutationHandler(rr, req, ps)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), `"applied":true`)

	clientset, err := k8sclient.NewForConfig(testEnvInstance.Config)
	require.NoError(t, err)
	nsObj, err := clientset.CoreV1().Namespaces().Get(context.Background(), ns, metav1.GetOptions{})
	require.NoError(t, err)
	_, hasLabel := nsObj.Labels["modelmesh-enabled"]
	assert.False(t, hasLabel, "label should not be applied in dry-run mode")
}

func TestNamespaceMutation_PatchFailure_ReturnsAppliedFalse(t *testing.T) {
	// Do NOT create the namespace - patching a non-existent namespace triggers a failure
	// in the repository, which should return 200 with {applied: false} (matching Fastify).
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/namespaces/nonexistent-ns/1", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{
		{Key: "name", Value: "nonexistent-ns"},
		{Key: "context", Value: "1"},
	}
	app.NamespaceMutationHandler(rr, req, ps)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), `"applied":false`)
}

func TestIsSystemNamespace(t *testing.T) {
	tests := []struct {
		name     string
		ns       string
		expected bool
	}{
		{"openshift prefix", "openshift-monitoring", true},
		{"openshift exact", "openshift", true},
		{"kube prefix", "kube-system", true},
		{"kube exact", "kube", true},
		{"regular namespace", "my-project", false},
		{"opendatahub", "opendatahub", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, isSystemNamespace(tt.ns))
		})
	}
}

// deniedAccessClient is a KubernetesClientInterface where CheckAccess always denies.
type deniedAccessClient struct {
	stubDynClient
}

func (d *deniedAccessClient) GetUser(_ context.Context, _ *k8s.RequestIdentity) (string, error) {
	return "denied-user", nil
}

func (d *deniedAccessClient) CheckAccess(_ context.Context, _ *k8s.RequestIdentity, _, _, _, _ string) (bool, error) {
	return false, nil
}

type deniedAccessFactory struct{}

func (f *deniedAccessFactory) ExtractRequestIdentity(_ http.Header) (*k8s.RequestIdentity, error) {
	return nil, fmt.Errorf("not implemented")
}

func (f *deniedAccessFactory) ValidateRequestIdentity(_ *k8s.RequestIdentity) error {
	return nil
}

func (f *deniedAccessFactory) GetClient(_ context.Context) (k8s.KubernetesClientInterface, error) {
	return &deniedAccessClient{}, nil
}
