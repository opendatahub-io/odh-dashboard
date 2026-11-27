package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/fake"
	k8stesting "k8s.io/client-go/testing"
)

// RHAI-50760: on xKS, Core BFF serves model-serving-api's gateway discovery
// natively, with the caller's credentials, against the envtest Gateways seeded
// by k8mocks (mock_gateways.go).

// envtest tokens from k8mocks.DefaultTestUsers.
const (
	adminToken           = "FAKE_CLUSTER_ADMIN_TOKEN"    //nolint:gosec // G101: envtest fixture, not a credential
	gatewayDeployerToken = "FAKE_GATEWAY_DEPLOYER_TOKEN" //nolint:gosec // G101: envtest fixture, not a credential
	llmDeployerToken     = "FAKE_LLM_DEPLOYER_TOKEN"     //nolint:gosec // G101: envtest fixture, not a credential
	noAccessToken        = "FAKE_USER_B_TOKEN"           //nolint:gosec // G101: envtest fixture, not a credential
)

// newXKSGatewayApp is an xKS app whose repositories resolve caller clients from
// the envtest factory and whose service-account clients fail the test if used.
func newXKSGatewayApp(t *testing.T) *App {
	t.Helper()
	saDyn := dynamicfake.NewSimpleDynamicClient(runtime.NewScheme())
	saDyn.PrependReactor("*", "*", func(a k8stesting.Action) (bool, runtime.Object, error) {
		t.Errorf("service-account dynamic client used: %s %s", a.GetVerb(), a.GetResource().Resource)
		return true, nil, errors.New("service account must not be used")
	})
	saTyped := fake.NewSimpleClientset()
	saTyped.PrependReactor("*", "*", func(a k8stesting.Action) (bool, runtime.Object, error) {
		t.Errorf("service-account typed client used: %s %s", a.GetVerb(), a.GetResource().Resource)
		return true, nil, errors.New("service account must not be used")
	})
	return newTestApp(func(a *App) {
		a.config.PlatformType = config.PlatformXKS
		a.platformConfirmed = true
		a.repositories = repositories.NewRepositories(repositories.RepositoriesConfig{
			Platform:          config.PlatformXKS,
			PlatformConfirmed: true,
			SADynClient:       saDyn,
			SAClientset:       saTyped,
			CallerClients:     callerClientsFrom(testK8sFactory),
		})
	})
}

func gatewayRequest(token, query string) *http.Request {
	req := httptest.NewRequest(http.MethodGet, GatewayDiscoveryPath+query, nil)
	return reqWithIdentity(req, &k8s.RequestIdentity{UserID: "caller", Token: k8s.NewBearerToken(token)})
}

func gatewayKeys(t *testing.T, rr *httptest.ResponseRecorder) []string {
	t.Helper()
	var body models.GatewaysResponse
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &body))
	require.NotNil(t, body.Gateways, "gateways must be an array, never null")
	keys := []string{}
	for _, g := range body.Gateways {
		keys = append(keys, g.Namespace+"/"+g.Name+"/"+g.Listener+"/"+g.Status)
	}
	return keys
}

func TestGatewayDiscoveryHandler_CallerCredentials(t *testing.T) {
	tests := []struct {
		name      string
		token     string
		namespace string
		status    int
		want      []string
	}{
		{
			name: "cluster admin sees every listener that admits the namespace", token: adminToken, namespace: "test-ns-a",
			status: http.StatusOK,
			want: []string{
				"opendatahub/selector-gateway/https/NotReady",
				"opendatahub/selector-gateway/tenants/NotReady",
				"opendatahub/shared-gateway/http/Ready",
				"test-ns-a/project-gateway/default/Unknown",
			},
		},
		{
			name: "listeners for another namespace are filtered", token: adminToken, namespace: "test-ns-b",
			status: http.StatusOK,
			want:   []string{"opendatahub/selector-gateway/tenants/NotReady", "opendatahub/shared-gateway/http/Ready"},
		},
		{
			name: "a gateway reader without namespace read gets no team-selector listeners", token: gatewayDeployerToken, namespace: "test-ns-a",
			status: http.StatusOK,
			want: []string{
				"opendatahub/selector-gateway/https/NotReady",
				"opendatahub/shared-gateway/http/Ready",
				"test-ns-a/project-gateway/default/Unknown",
			},
		},
		{
			name: "a caller who may not deploy in the namespace gets an empty list", token: gatewayDeployerToken, namespace: "test-ns-b",
			status: http.StatusOK,
			want:   []string{},
		},
		{
			name: "a caller with no access gets an empty list", token: noAccessToken, namespace: "test-ns-a",
			status: http.StatusOK,
			want:   []string{},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := newXKSGatewayApp(t)
			rr := httptest.NewRecorder()
			app.GatewayDiscoveryHandler(rr, gatewayRequest(tt.token, "?namespace="+tt.namespace), nil)
			require.Equal(t, tt.status, rr.Code, rr.Body.String())
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))
			assert.Equal(t, tt.want, gatewayKeys(t, rr))
		})
	}
}

// A caller who may deploy but may not list Gateways gets the API server's 403
// as a Kubernetes Status; there is no service-account fallback (the app's
// service-account clients fail the test if touched).
func TestGatewayDiscoveryHandler_GatewayListDeniedIs403(t *testing.T) {
	app := newXKSGatewayApp(t)
	rr := httptest.NewRecorder()
	app.GatewayDiscoveryHandler(rr, gatewayRequest(llmDeployerToken, "?namespace=test-ns-a"), nil)
	require.Equal(t, http.StatusForbidden, rr.Code, rr.Body.String())
	var status struct {
		Kind   string `json:"kind"`
		Reason string `json:"reason"`
		Code   int    `json:"code"`
	}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &status))
	assert.Equal(t, "Status", status.Kind)
	assert.Equal(t, "Forbidden", status.Reason)
	assert.Equal(t, http.StatusForbidden, status.Code)
}

func TestGatewayDiscoveryHandler_RejectsBadNamespaces(t *testing.T) {
	for name, query := range map[string]string{
		"missing":   "",
		"empty":     "?namespace=",
		"uppercase": "?namespace=Test-NS",
		"too long":  "?namespace=" + strings.Repeat("a", 64),
		"dotted":    "?namespace=a.b",
		"traversal": "?namespace=..%2Fkube-system",
	} {
		t.Run(name, func(t *testing.T) {
			app := newXKSGatewayApp(t)
			rr := httptest.NewRecorder()
			app.GatewayDiscoveryHandler(rr, gatewayRequest(adminToken, query), nil)
			assert.Equal(t, http.StatusBadRequest, rr.Code, rr.Body.String())
		})
	}
}

func TestGatewayDiscoveryHandler_MissingIdentityIs401(t *testing.T) {
	app := newXKSGatewayApp(t)
	rr := httptest.NewRecorder()
	app.GatewayDiscoveryHandler(rr, httptest.NewRequest(http.MethodGet, GatewayDiscoveryPath+"?namespace=test-ns-a", nil), nil)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

// errAccessClient fails the access review.
type errAccessClient struct{ stubDynClient }

func (errAccessClient) CheckAccess(context.Context, *k8s.RequestIdentity, string, string, string, string) (bool, error) {
	return false, errors.New("ssar unavailable")
}

type staticClientFactory struct {
	deniedAccessFactory
	client k8s.KubernetesClientInterface
}

func (f *staticClientFactory) GetClient(context.Context) (k8s.KubernetesClientInterface, error) {
	return f.client, nil
}

// A failed access review is an error, not an empty list: the caller cannot
// tell "no gateways" from "the check did not run" otherwise.
func TestGatewayDiscoveryHandler_AccessReviewFailureIs500(t *testing.T) {
	app := newXKSGatewayApp(t)
	app.kubernetesClientFactory = &staticClientFactory{client: &errAccessClient{}}
	rr := httptest.NewRecorder()
	app.GatewayDiscoveryHandler(rr, gatewayRequest(adminToken, "?namespace=test-ns-a"), nil)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// unauthorizedAccessClient's access review is rejected by the API server.
type unauthorizedAccessClient struct{ stubDynClient }

func (unauthorizedAccessClient) CheckAccess(context.Context, *k8s.RequestIdentity, string, string, string, string) (bool, error) {
	return false, fmt.Errorf("failed to check access: %w", k8serrors.NewUnauthorized("token expired"))
}

// An access review the API server rejects keeps the API server's status.
func TestGatewayDiscoveryHandler_AccessReviewKeepsTheAPIServerStatus(t *testing.T) {
	app := newXKSGatewayApp(t)
	app.kubernetesClientFactory = &staticClientFactory{client: &unauthorizedAccessClient{}}
	rr := httptest.NewRecorder()
	app.GatewayDiscoveryHandler(rr, gatewayRequest(adminToken, "?namespace=test-ns-a"), nil)
	assert.Equal(t, http.StatusUnauthorized, rr.Code, rr.Body.String())
}

// deadlineAccessClient records whether the access review ran under a deadline.
type deadlineAccessClient struct {
	stubDynClient
	remaining time.Duration
}

func (c *deadlineAccessClient) CheckAccess(ctx context.Context, _ *k8s.RequestIdentity, _, _, _, _ string) (bool, error) {
	if deadline, ok := ctx.Deadline(); ok {
		c.remaining = time.Until(deadline)
	}
	return false, nil
}

// The access review and the discovery share one budget.
func TestGatewayDiscoveryHandler_AccessReviewRunsUnderTheBudget(t *testing.T) {
	client := &deadlineAccessClient{}
	app := newXKSGatewayApp(t)
	app.kubernetesClientFactory = &staticClientFactory{client: client}
	rr := httptest.NewRecorder()
	app.GatewayDiscoveryHandler(rr, gatewayRequest(adminToken, "?namespace=test-ns-a"), nil)
	require.Equal(t, http.StatusOK, rr.Code)
	assert.Greater(t, client.remaining, repositories.GatewayDiscoveryTimeout-time.Second)
	assert.LessOrEqual(t, client.remaining, repositories.GatewayDiscoveryTimeout)
}

// The access review is the one model-serving-api runs.
type recordingAccessClient struct {
	stubDynClient
	got []string
}

func (c *recordingAccessClient) CheckAccess(_ context.Context, _ *k8s.RequestIdentity, verb, group, resource, namespace string) (bool, error) {
	c.got = []string{verb, group, resource, namespace}
	return false, nil
}

func TestGatewayDiscoveryHandler_ChecksLLMInferenceServiceCreate(t *testing.T) {
	client := &recordingAccessClient{}
	app := newXKSGatewayApp(t)
	app.kubernetesClientFactory = &staticClientFactory{client: client}
	rr := httptest.NewRecorder()
	app.GatewayDiscoveryHandler(rr, gatewayRequest(adminToken, "?namespace=test-ns-a"), nil)
	require.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, []string{"create", "serving.kserve.io", "llminferenceservices", "test-ns-a"}, client.got)
}

// Routing: on xKS the gateway path is native, every other model-serving path
// is the API 404 and nothing is proxied; on OpenShift the whole prefix keeps
// going to model-serving-api.
func TestModelServingRoutes_XKSServesGatewaysNatively(t *testing.T) {
	upstreamHit := make(chan string, 4)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upstreamHit <- r.URL.Path
		w.WriteHeader(http.StatusTeapot)
	}))
	defer upstream.Close()

	app := newXKSGatewayApp(t)
	app.config.ModelServingServiceHost = upstream.URL
	app.config.DevMode = true
	require.NoError(t, app.initModelServingProxy())
	assert.Nil(t, app.modelServingProxy, "xKS must not build a model-serving proxy, even with MODEL_SERVING_HOST set")
	mux := app.newServiceMux()

	serve := func(method, path string) *httptest.ResponseRecorder {
		req := reqWithIdentity(httptest.NewRequest(method, path, nil),
			&k8s.RequestIdentity{UserID: "user@example.com", Token: k8s.NewBearerToken(adminToken)})
		rr := httptest.NewRecorder()
		mux.ServeHTTP(rr, req)
		return rr
	}

	rr := serve(http.MethodGet, GatewayDiscoveryPath+"?namespace=test-ns-b")
	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
	assert.Equal(t, []string{"opendatahub/selector-gateway/tenants/NotReady", "opendatahub/shared-gateway/http/Ready"}, gatewayKeys(t, rr))

	rr = serve(http.MethodGet, PathPrefix+GatewayDiscoveryPath+"?namespace=test-ns-b")
	assert.Equal(t, http.StatusOK, rr.Code, "the BFF-prefixed path serves the same route")

	for _, path := range []string{
		ModelServingProxyPrefix + "api/v1/samples/llm-d?type=router",
		ModelServingProxyPrefix + "anything",
		GatewayDiscoveryPath + "/extra",
	} {
		assert.Equal(t, http.StatusNotFound, serve(http.MethodGet, path).Code, path)
	}
	assert.Equal(t, http.StatusMethodNotAllowed, serve(http.MethodPost, GatewayDiscoveryPath+"?namespace=test-ns-a").Code)
	select {
	case p := <-upstreamHit:
		t.Fatalf("xKS forwarded %s to model-serving-api", p)
	default:
	}
}

func TestModelServingRoutes_OpenShiftKeepsTheProxy(t *testing.T) {
	upstreamHit := make(chan string, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upstreamHit <- r.URL.Path + "?" + r.URL.RawQuery
		w.WriteHeader(http.StatusTeapot)
	}))
	defer upstream.Close()

	app := newTestApp(func(a *App) {
		a.config.PlatformType = config.PlatformOpenShift
		a.config.ModelServingServiceHost = upstream.URL
		a.config.DevMode = true
	})
	require.NoError(t, app.initModelServingProxy())
	require.NotNil(t, app.modelServingProxy)
	mux := app.newServiceMux()

	req := reqWithIdentity(httptest.NewRequest(http.MethodGet, GatewayDiscoveryPath+"?namespace=test-ns-a", nil),
		&k8s.RequestIdentity{UserID: "user@example.com", Token: k8s.NewBearerToken(adminToken)})
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusTeapot, rr.Code, "OpenShift must proxy the gateway path to model-serving-api")
	assert.Equal(t, "/api/v1/gateways?namespace=test-ns-a", recvWithin(t, upstreamHit))
}

// A platform guessed as xKS after an inconclusive probe may be OpenShift, where
// model-serving-api exists: the proxy stays and no native route is added, so
// ODH and RHOAI keep their behaviour when detection fails.
func TestModelServingRoutes_UnconfirmedXKSKeepsTheProxy(t *testing.T) {
	upstreamHit := make(chan string, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upstreamHit <- r.URL.Path
		w.WriteHeader(http.StatusTeapot)
	}))
	defer upstream.Close()

	app := newXKSGatewayApp(t)
	app.platformConfirmed = false
	app.config.ModelServingServiceHost = upstream.URL
	app.config.DevMode = true
	require.NoError(t, app.initModelServingProxy())
	require.NotNil(t, app.modelServingProxy)
	mux := app.newServiceMux()

	for _, path := range []string{GatewayDiscoveryPath + "?namespace=test-ns-a", ModelServingProxyPrefix + "api/v1/samples/llm-d?type=router"} {
		req := reqWithIdentity(httptest.NewRequest(http.MethodGet, path, nil),
			&k8s.RequestIdentity{UserID: "user@example.com", Token: k8s.NewBearerToken(adminToken)})
		rr := httptest.NewRecorder()
		mux.ServeHTTP(rr, req)
		assert.Equal(t, http.StatusTeapot, rr.Code, path)
		recvWithin(t, upstreamHit)
	}
}

// A proxy set on a confirmed xKS app (for example by a future init path) must
// not shadow the native route: registration skips it.
func TestModelServingRoutes_XKSNeverMountsAProxy(t *testing.T) {
	app := newXKSGatewayApp(t)
	app.modelServingProxy = http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		t.Error("the model-serving proxy must not serve on confirmed xKS")
		w.WriteHeader(http.StatusTeapot)
	})
	mux := app.newServiceMux()
	req := reqWithIdentity(httptest.NewRequest(http.MethodGet, GatewayDiscoveryPath+"?namespace=test-ns-b", nil),
		&k8s.RequestIdentity{UserID: "user@example.com", Token: k8s.NewBearerToken(adminToken)})
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, []string{"opendatahub/selector-gateway/tenants/NotReady", "opendatahub/shared-gateway/http/Ready"}, gatewayKeys(t, rr))
}

// The repository the xKS app wires uses the caller's clients.
func TestGatewayDiscovery_AppWiringUsesCallerCredentials(t *testing.T) {
	var used bool
	app := newTestApp(func(a *App) {
		a.config.PlatformType = config.PlatformXKS
		a.repositories = repositories.NewRepositories(repositories.RepositoriesConfig{
			Platform: config.PlatformXKS, PlatformConfirmed: true,
			CallerClients: func(context.Context) (kubernetes.Interface, dynamic.Interface, error) {
				used = true
				return fake.NewSimpleClientset(), dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(),
					map[schema.GroupVersionResource]string{models.GatewayGVR: "GatewayList"}), nil
			},
		})
	})
	_, err := app.repositories.GatewayDiscovery.Discover(context.Background(), "test-ns-a")
	require.NoError(t, err)
	assert.True(t, used)
}
