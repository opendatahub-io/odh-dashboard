package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// These run against envtest, whose API server authorizes the reviews with real
// RBAC: user A deploys in test-ns-a, user B is read-only in test-ns-b, and
// neither may list namespaces.
func newNamespaceAccessTestApp(candidates ...string) *App {
	return newTestApp(func(a *App) {
		a.config.PlatformType = config.PlatformXKS
		a.repositories.NamespaceAccess = repositories.NewNamespaceAccessRepository(candidates, "opendatahub")
	})
}

func namespaceAccessRequest(user k8mocks.TestUser, path string) *http.Request {
	return reqWithIdentity(httptest.NewRequest(http.MethodGet, path, nil), &k8s.RequestIdentity{
		UserID: user.UserName,
		Groups: user.Groups,
		Token:  k8s.NewBearerToken(user.Token),
	})
}

func decodeAccessList(t *testing.T, rr *httptest.ResponseRecorder) models.NamespaceAccessList {
	t.Helper()
	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
	var env NamespaceAccessListEnvelope
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &env))
	return env.Data
}

func accessNames(list models.NamespaceAccessList) []string {
	out := []string{}
	for _, ns := range list.Namespaces {
		out = append(out, ns.Name)
	}
	return out
}

func TestNamespaceAccess_DeployerWithoutNamespaceList(t *testing.T) {
	app := newNamespaceAccessTestApp("test-ns-a", "test-ns-b", "test-ns-c")
	rr := httptest.NewRecorder()
	app.GetNamespaceAccessHandler(rr, namespaceAccessRequest(k8mocks.DefaultTestUsers[1], NamespaceAccessPath), nil)

	list := decodeAccessList(t, rr)
	assert.Equal(t, models.NamespaceSourceCandidates, list.Source)
	assert.True(t, list.Complete)
	assert.Equal(t, []string{"test-ns-a"}, accessNames(list))
	ns := list.Namespaces[0]
	assert.Equal(t, models.NamespaceActions{View: true, Deploy: true, Edit: true, StartStop: true, Delete: true, CreateTokenAuth: true, ManageTokenAuth: true}, ns.Actions)
	assert.Equal(t, "Active", ns.Phase, "the RoleBinding's namespace get is honoured")
}

func TestNamespaceAccess_ReadOnlyUserIsNotOfferedMutations(t *testing.T) {
	app := newNamespaceAccessTestApp("test-ns-a", "test-ns-b", "test-ns-c")
	rr := httptest.NewRecorder()
	app.GetNamespaceAccessHandler(rr, namespaceAccessRequest(k8mocks.DefaultTestUsers[2], NamespaceAccessPath), nil)

	list := decodeAccessList(t, rr)
	assert.Equal(t, []string{"test-ns-b"}, accessNames(list))
	assert.Equal(t, models.NamespaceActions{View: true}, list.Namespaces[0].Actions)
	assert.Equal(t, models.AccessDenied, list.Namespaces[0].Permissions["core/secrets"]["list"])
}

func TestNamespaceAccess_AdminUsesClusterList(t *testing.T) {
	app := newNamespaceAccessTestApp()
	rr := httptest.NewRecorder()
	app.GetNamespaceAccessHandler(rr, namespaceAccessRequest(k8mocks.DefaultTestUsers[0], NamespaceAccessPath), nil)

	list := decodeAccessList(t, rr)
	assert.Equal(t, models.NamespaceSourceClusterList, list.Source)
	assert.Contains(t, accessNames(list), "test-ns-c")
}

func TestNamespaceAccess_NoCandidatesIsAnEmptyArray(t *testing.T) {
	app := newNamespaceAccessTestApp()
	rr := httptest.NewRecorder()
	app.GetNamespaceAccessHandler(rr, namespaceAccessRequest(k8mocks.DefaultTestUsers[2], NamespaceAccessPath), nil)

	require.Equal(t, http.StatusOK, rr.Code)
	assert.JSONEq(t, `[]`, string(mustField(t, rr.Body.Bytes(), "namespaces")))
}

func TestNamespaceAccess_RequestedNamespacesAreEvaluated(t *testing.T) {
	app := newNamespaceAccessTestApp()
	rr := httptest.NewRecorder()
	app.GetNamespaceAccessHandler(rr, namespaceAccessRequest(k8mocks.DefaultTestUsers[2],
		NamespaceAccessPath+"?namespace=test-ns-b&namespace=test-ns-a"), nil)

	assert.Equal(t, []string{"test-ns-b"}, accessNames(decodeAccessList(t, rr)))
}

func TestNamespaceAccess_RejectsInvalidRequests(t *testing.T) {
	app := newNamespaceAccessTestApp()
	for _, q := range []string{"?namespace=Not_Valid", "?namespace="} {
		rr := httptest.NewRecorder()
		app.GetNamespaceAccessHandler(rr, namespaceAccessRequest(k8mocks.DefaultTestUsers[2], NamespaceAccessPath+q), nil)
		assert.Equal(t, http.StatusBadRequest, rr.Code, q)
	}
	many := "?"
	for i := 0; i <= repositories.MaxRequestedNamespaces; i++ {
		many += "namespace=ns&"
	}
	rr := httptest.NewRecorder()
	app.GetNamespaceAccessHandler(rr, namespaceAccessRequest(k8mocks.DefaultTestUsers[2], NamespaceAccessPath+many), nil)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestNamespaceAccessByName(t *testing.T) {
	app := newNamespaceAccessTestApp()
	userB := k8mocks.DefaultTestUsers[2]
	for _, tc := range []struct {
		name, ns string
		status   int
	}{
		{"authorized", "test-ns-b", http.StatusOK},
		{"denied", "test-ns-a", http.StatusForbidden},
		{"nonexistent looks like denied", "does-not-exist", http.StatusForbidden},
		{"invalid", "Bad_Name", http.StatusBadRequest},
	} {
		t.Run(tc.name, func(t *testing.T) {
			rr := httptest.NewRecorder()
			app.GetNamespaceAccessByNameHandler(rr, namespaceAccessRequest(userB, NamespaceAccessPath+"/"+tc.ns),
				httprouter.Params{{Key: "name", Value: tc.ns}})
			assert.Equal(t, tc.status, rr.Code, rr.Body.String())
			if tc.status != http.StatusOK {
				assert.NotContains(t, rr.Body.String(), tc.ns, "errors never echo the namespace")
			}
		})
	}
}

func TestNamespaceAccess_AbsentOnOpenShift(t *testing.T) {
	app := newTestApp(func(a *App) { a.config.PlatformType = config.PlatformOpenShift })
	ts := httptest.NewServer(app.Routes())
	defer ts.Close()
	for _, p := range []string{NamespaceAccessPath, NamespaceAccessPath + "/test-ns-a"} {
		resp, err := http.Get(ts.URL + p)
		require.NoError(t, err)
		_ = resp.Body.Close()
		assert.Equal(t, http.StatusNotFound, resp.StatusCode, p)
	}
}

// The namespace lookup the manual fallback already uses must honour access
// granted by a RoleBinding inside the namespace, not only cluster-wide grants.
func TestGetNamespaceHandler_RoleBindingGrantsLookup(t *testing.T) {
	app := newTestApp()
	userA := k8mocks.DefaultTestUsers[1] // RoleBinding in test-ns-a only, no ClusterRole get
	rr := httptest.NewRecorder()
	app.GetNamespaceHandler(rr, namespaceAccessRequest(userA, NamespacePath+"/test-ns-a"),
		httprouter.Params{{Key: "name", Value: "test-ns-a"}})
	assert.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
}

func mustField(t *testing.T, body []byte, field string) json.RawMessage {
	t.Helper()
	var env struct {
		Data map[string]json.RawMessage `json:"data"`
	}
	require.NoError(t, json.Unmarshal(body, &env))
	v, ok := env.Data[field]
	require.True(t, ok, "missing %s", field)
	return v
}

// failingReviewsFactory hands out the real caller client with every access
// review failing, as when the authorization service is down.
type failingReviewsFactory struct{ k8s.KubernetesClientFactory }

type failingReviewsClient struct{ k8s.KubernetesClientInterface }

func (f failingReviewsFactory) GetClient(ctx context.Context) (k8s.KubernetesClientInterface, error) {
	c, err := f.KubernetesClientFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}
	return failingReviewsClient{c}, nil
}

func (failingReviewsClient) ReviewAccess(context.Context, *k8s.RequestIdentity, k8s.AccessReviewAttributes) (k8s.AccessReviewResult, error) {
	var none k8s.AccessReviewResult
	return none, errors.New("authorization service unavailable")
}

func TestNamespaceAccess_UnavailableCarriesTheIssueCodes(t *testing.T) {
	app := newNamespaceAccessTestApp("test-ns-a")
	app.kubernetesClientFactory = failingReviewsFactory{app.kubernetesClientFactory}
	rr := httptest.NewRecorder()
	app.GetNamespaceAccessHandler(rr, namespaceAccessRequest(k8mocks.DefaultTestUsers[2], NamespaceAccessPath), nil)

	require.Equal(t, http.StatusServiceUnavailable, rr.Code, rr.Body.String())
	var body struct {
		Error struct {
			Code      string                           `json:"code"`
			RequestID string                           `json:"requestId"`
			Issues    []models.NamespaceDiscoveryIssue `json:"issues"`
		} `json:"error"`
	}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &body))
	assert.Equal(t, "SERVICE_UNAVAILABLE", body.Error.Code)
	assert.NotEmpty(t, body.Error.RequestID)
	assert.Contains(t, body.Error.Issues, models.NamespaceDiscoveryIssue{Code: models.IssueAccessReviewFailed, Count: 1},
		"the cause tells an authorization-service failure from a denial")
}
