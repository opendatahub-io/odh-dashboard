package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

type namespaceStubClient struct {
	stubDynClient
	ns                         *corev1.Namespace
	listErr, accessErr, getErr error
	allowed                    bool
	getCalled                  bool
}

type namespacePreflightClient struct {
	namespaceStubClient
	userErr error
}

func (s *namespacePreflightClient) GetUser(context.Context, *k8s.RequestIdentity) (string, error) {
	return "", s.userErr
}

func (s *namespaceStubClient) GetNamespaces(context.Context, *k8s.RequestIdentity) ([]corev1.Namespace, error) {
	return nil, s.listErr
}
func (s *namespaceStubClient) CanGetNamespace(_ context.Context, _ *k8s.RequestIdentity, _ string) (bool, error) {
	return s.allowed, s.accessErr
}
func (s *namespaceStubClient) GetNamespace(_ context.Context, _ *k8s.RequestIdentity, _ string) (*corev1.Namespace, error) {
	s.getCalled = true
	return s.ns, s.getErr
}

type namespaceStubFactory struct {
	k8s.KubernetesClientFactory
	client k8s.KubernetesClientInterface
}

func (f namespaceStubFactory) GetClient(context.Context) (k8s.KubernetesClientInterface, error) {
	return f.client, nil
}

func namespaceTestRequest(path string) *http.Request {
	return reqWithIdentity(httptest.NewRequest(http.MethodGet, path, nil), &k8s.RequestIdentity{Token: k8s.NewBearerToken("fake")})
}

func TestNamespacesHandler_ReturnsNamespaces(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, NamespacePath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.GetNamespacesHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)

	data, ok := body["data"].([]any)
	require.True(t, ok)
	assert.NotEmpty(t, data, "admin user should see at least one namespace")
	first := data[0].(map[string]any)
	assert.NotEmpty(t, first["name"])
	assert.Equal(t, first["name"], first["displayName"])
	assert.NotContains(t, first, "phase")
	for _, item := range data {
		ns := item.(map[string]any)
		if value, present := ns["isAiProject"]; present {
			assert.IsType(t, true, value)
		}
	}
}

func TestNamespacesHandler_NonAdminUserForbidden(t *testing.T) {
	app := newTestApp()
	userA := k8mocks.DefaultTestUsers[1]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, NamespacePath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: userA.UserName,
		Groups: userA.Groups,
		Token:  k8s.NewBearerToken(userA.Token),
	})

	app.GetNamespacesHandler(rr, req, nil)

	assert.Equal(t, http.StatusForbidden, rr.Code)
}

func TestNamespacesHandler_MissingIdentity(t *testing.T) {
	app := newTestApp()

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, NamespacePath, nil)

	app.GetNamespacesHandler(rr, req, nil)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)

	errObj, ok := body["error"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "UNAUTHORIZED", errObj["code"])
}

func TestNamespacesHandler_EmptyAndErrors(t *testing.T) {
	for _, tc := range []struct {
		name   string
		err    error
		status int
		code   string
	}{
		{"empty", nil, 200, ""},
		{"upstream", errors.New("connection reset"), 500, "INTERNAL_SERVER_ERROR"},
		{"timeout", context.DeadlineExceeded, 504, "GATEWAY_TIMEOUT"},
		{"unavailable", k8serrors.NewServiceUnavailable("offline"), 503, "SERVICE_UNAVAILABLE"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			client := &namespaceStubClient{listErr: tc.err}
			app := newTestApp(func(app *App) { app.kubernetesClientFactory = namespaceStubFactory{client: client} })
			rr := httptest.NewRecorder()
			app.GetNamespacesHandler(rr, namespaceTestRequest(NamespacePath), nil)
			assert.Equal(t, tc.status, rr.Code)
			if tc.err == nil {
				assert.JSONEq(t, `{"data":null}`, rr.Body.String())
			} else {
				assert.Contains(t, rr.Body.String(), tc.code)
			}
		})
	}
}

func TestNamespaceHandler_ExactLookupRBAC(t *testing.T) {
	app := newTestApp()
	before, err := testSAClientset.CoreV1().Namespaces().Get(context.Background(), "test-ns-b", metav1.GetOptions{})
	require.NoError(t, err)
	user := k8mocks.DefaultTestUsers[2] // list denied; named cluster role grants get test-ns-b only
	request := func(path string) *http.Request {
		return reqWithIdentity(httptest.NewRequest(http.MethodGet, path, nil), &k8s.RequestIdentity{
			UserID: user.UserName, Groups: user.Groups, Token: k8s.NewBearerToken(user.Token),
		})
	}
	list := httptest.NewRecorder()
	app.GetNamespacesHandler(list, request(NamespacePath), nil)
	assert.Equal(t, http.StatusForbidden, list.Code)

	for _, tc := range []struct {
		name   string
		status int
	}{
		{"test-ns-b", 200}, {"test-ns-a", 403}, {"missing-namespace", 403},
	} {
		t.Run(tc.name, func(t *testing.T) {
			rr := httptest.NewRecorder()
			app.GetNamespaceHandler(rr, request(NamespacePath+"/"+tc.name), httprouter.Params{{Key: "name", Value: tc.name}})
			assert.Equal(t, tc.status, rr.Code, rr.Body.String())
			if tc.status == 200 {
				assert.Contains(t, rr.Body.String(), `"name":"test-ns-b"`)
			}
		})
	}

	admin := k8mocks.DefaultTestUsers[0]
	missing := "missing-namespace"
	rr := httptest.NewRecorder()
	app.GetNamespaceHandler(rr, reqWithIdentity(httptest.NewRequest(http.MethodGet, NamespacePath+"/"+missing, nil), &k8s.RequestIdentity{
		UserID: admin.UserName, Groups: admin.Groups, Token: k8s.NewBearerToken(admin.Token),
	}), httprouter.Params{{Key: "name", Value: missing}})
	assert.Equal(t, http.StatusNotFound, rr.Code)
	after, err := testSAClientset.CoreV1().Namespaces().Get(context.Background(), "test-ns-b", metav1.GetOptions{})
	require.NoError(t, err)
	assert.Equal(t, before, after, "successful and failed lookups must not mutate the namespace")
}

func TestNamespaceHandler_ValidationAndFailures(t *testing.T) {
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name:        "valid",
			Annotations: map[string]string{"openshift.io/display-name": "My Project"},
			Labels:      map[string]string{"opendatahub.io/dashboard": "true"},
		},
		Status: corev1.NamespaceStatus{Phase: corev1.NamespaceTerminating},
	}
	for _, tc := range []struct {
		name              string
		allowed           bool
		accessErr, getErr error
		status            int
		getCalled         bool
	}{
		{"valid", true, nil, nil, 200, true},
		{"UPPER", true, nil, nil, 400, false},
		{"bad.name", true, nil, nil, 400, false},
		{"no", false, nil, nil, 403, false},
		{"missing", true, nil, errors.New("upstream failed"), 500, true},
		{"unauthorized", true, k8serrors.NewUnauthorized("expired token"), nil, 401, false},
		{"forbidden", true, nil, k8serrors.NewForbidden(schema.GroupResource{Resource: "namespaces"}, "valid", errors.New("denied")), 403, true},
		{"timeout", true, context.DeadlineExceeded, nil, 504, false},
		{"unavailable", true, nil, k8serrors.NewServiceUnavailable("offline"), 503, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			client := &namespaceStubClient{ns: ns, allowed: tc.allowed, accessErr: tc.accessErr, getErr: tc.getErr}
			app := newTestApp(func(app *App) { app.kubernetesClientFactory = namespaceStubFactory{client: client} })
			rr := httptest.NewRecorder()
			app.GetNamespaceHandler(rr, namespaceTestRequest(NamespacePath+"/"+tc.name), httprouter.Params{{Key: "name", Value: tc.name}})
			assert.Equal(t, tc.status, rr.Code, rr.Body.String())
			assert.Equal(t, tc.getCalled, client.getCalled)
			if tc.status == 200 {
				assert.JSONEq(t, `{"data":{"name":"valid","displayName":"My Project","phase":"Terminating","isAiProject":true}}`, rr.Body.String())
			}
		})
	}
}

func TestNamespaceRoute_GetUserError(t *testing.T) {
	for _, tc := range []struct {
		name   string
		err    error
		status int
		code   string
	}{
		{"deadline", context.DeadlineExceeded, http.StatusGatewayTimeout, "GATEWAY_TIMEOUT"},
		{"timeout", k8serrors.NewTimeoutError("timeout", 1), http.StatusGatewayTimeout, "GATEWAY_TIMEOUT"},
		{"unavailable", k8serrors.NewServiceUnavailable("offline"), http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE"},
		{"unauthorized", k8serrors.NewUnauthorized("expired"), http.StatusUnauthorized, "UNAUTHORIZED"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			client := &namespacePreflightClient{userErr: tc.err}
			app := newTestApp(func(app *App) { app.kubernetesClientFactory = namespaceStubFactory{client: client} })
			router := httprouter.New()
			app.registerBaseRoutes(router)
			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, namespaceTestRequest(NamespacePath+"/test-ns-b"))

			assert.Equal(t, tc.status, rr.Code)
			var body struct {
				Error struct {
					Code string `json:"code"`
				} `json:"error"`
			}
			require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &body))
			assert.Equal(t, tc.code, body.Error.Code)
			assert.False(t, client.getCalled)
		})
	}
}
