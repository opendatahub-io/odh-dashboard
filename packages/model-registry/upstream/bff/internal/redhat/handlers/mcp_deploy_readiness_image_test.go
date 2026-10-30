package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/kubeflow/hub/ui/bff/internal/api"
	"github.com/kubeflow/hub/ui/bff/internal/config"
	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	"github.com/kubeflow/hub/ui/bff/internal/models"
	redhatrepos "github.com/kubeflow/hub/ui/bff/internal/redhat/repositories"
)

const openShiftMcpServerTestImage = "registry.redhat.io/openshift-mcp/openshift-mcp-server-rhel9:1.0"

// mcpServersAccessKubeClient answers mcpservers access checks and records them.
type mcpServersAccessKubeClient struct {
	k8s.KubernetesClientInterface
	allow bool
	// allowVerbs, when set, decides per verb instead of allow.
	allowVerbs map[string]bool
	checkErr   error

	mu     sync.Mutex
	checks []string
}

func (c *mcpServersAccessKubeClient) CanVerbMcpServersInNamespace(_ context.Context, _ *k8s.RequestIdentity, namespace, verb string) (bool, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.checks = append(c.checks, verb+" "+namespace)
	if c.allowVerbs != nil {
		return c.allowVerbs[verb], c.checkErr
	}
	return c.allow, c.checkErr
}

func (c *mcpServersAccessKubeClient) recordedChecks() []string {
	c.mu.Lock()
	defer c.mu.Unlock()
	return append([]string(nil), c.checks...)
}

type mcpServersAccessKubeFactory struct{ client *mcpServersAccessKubeClient }

func (f *mcpServersAccessKubeFactory) GetClient(context.Context) (k8s.KubernetesClientInterface, error) {
	return f.client, nil
}
func (f *mcpServersAccessKubeFactory) ExtractRequestIdentity(http.Header) (*k8s.RequestIdentity, error) {
	return &k8s.RequestIdentity{UserID: "test-user", Token: "test-token"}, nil
}
func (f *mcpServersAccessKubeFactory) ValidateRequestIdentity(*k8s.RequestIdentity) error { return nil }

// newMcpDeployGateTestApp serves the real routes with user-token auth (as RHOAI runs the
// BFF), the given MCPLifecycleOperator reader, and a fake mcpservers access check.
func newMcpDeployGateTestApp(t *testing.T, reader redhatrepos.MCPLifecycleOperatorReader, allow bool) (http.Handler, *mcpServersAccessKubeClient) {
	t.Helper()
	return newMcpDeployGateTestAppWithClient(t, reader, &mcpServersAccessKubeClient{allow: allow})
}

func newMcpDeployGateTestAppWithClient(t *testing.T, reader redhatrepos.MCPLifecycleOperatorReader, client *mcpServersAccessKubeClient) (http.Handler, *mcpServersAccessKubeClient) {
	t.Helper()
	original := newMcpLifecycleOperatorReader
	newMcpLifecycleOperatorReader = func(*api.App) redhatrepos.MCPLifecycleOperatorReader { return reader }
	t.Cleanup(func() { newMcpLifecycleOperatorReader = original })

	app := api.NewTestApp(
		config.EnvConfig{AuthMethod: config.AuthMethodUser, DeploymentMode: config.DeploymentModeFederated},
		noopLogger(),
		&mcpServersAccessKubeFactory{client: client},
		nil,
	)
	return app.Routes(), client
}

func operatorWithoutGateways(t *testing.T) *unstructured.Unstructured {
	t.Helper()
	obj := redhatrepos.NewMockMCPLifecycleOperator()
	unstructured.RemoveNestedField(obj.Object, "status", "availableMCPGateways")
	return obj
}

func operatorNotReady(t *testing.T) *unstructured.Unstructured {
	t.Helper()
	obj := redhatrepos.NewMockMCPLifecycleOperator()
	require.NoError(t, unstructured.SetNestedSlice(obj.Object,
		[]interface{}{map[string]interface{}{"type": "Ready", "status": "False"}}, "status", "conditions"))
	return obj
}

func deployReadinessPath(query url.Values) string {
	return api.McpDeployReadinessPath + "?" + query.Encode()
}

func TestIsOpenShiftMcpServerImage(t *testing.T) {
	tests := []struct {
		ref  string
		want bool
	}{
		{openShiftMcpServerTestImage, true},
		{"oci://registry.redhat.io/openshift-mcp-tech-preview/openshift-mcp-server-rhel9:0.4", true},
		{"mirror.example.com:5000/ocp/openshift-mcp-server-rhel9@sha256:0123abcd", true},
		{"localhost:5000/openshift-mcp-server-rhel9", true},
		{"openshift-mcp-server-rhel9:1.0", true},
		{"quay.io/example/openshift-mcp-server:latest", true},
		{"  REGISTRY.REDHAT.IO/OPENSHIFT-MCP/OPENSHIFT-MCP-SERVER-RHEL9:1.0  ", true},
		{"quay.io/containers/kubernetes_mcp_server:latest", false},
		{"quay.io/example/openshift-mcp-server-proxy:1.0", false},
		{"quay.io/openshift-mcp-server-rhel9/other-server:1.0", false},
		{"", false},
	}
	for _, tt := range tests {
		t.Run(tt.ref, func(t *testing.T) {
			assert.Equal(t, tt.want, isOpenShiftMcpServerImage(tt.ref))
		})
	}
}

func TestMcpImageRequiresGateway(t *testing.T) {
	assert.True(t, mcpImageRequiresGateway(openShiftMcpServerTestImage), "OpenShift image") //nolint:staticcheck
	assert.False(t, mcpImageRequiresGateway("quay.io/example/other:1.0"), "other image")    //nolint:staticcheck
	assert.False(t, mcpImageRequiresGateway(""), "no image")                                //nolint:staticcheck
}

func TestMcpDeployReadiness(t *testing.T) {
	tests := []struct {
		name            string
		query           url.Values
		reader          *countingOperatorReader
		gatewayRequired bool
		deployable      bool
		reason          models.McpDeployReadinessReason
		wantReads       int32
		wantChecks      []string
	}{
		{
			name:            "OpenShift image with a usable gateway",
			query:           url.Values{"image": {openShiftMcpServerTestImage}},
			reader:          &countingOperatorReader{obj: redhatrepos.NewMockMCPLifecycleOperator()},
			gatewayRequired: true, deployable: true, wantReads: 1, wantChecks: []string{"create team-ns"},
		},
		{
			name:            "mirrored OpenShift image without a gateway",
			query:           url.Values{"image": {"mirror.example.com:5000/ocp/openshift-mcp-server-rhel9@sha256:0123abcd"}, "registryServer": {"io.example/renamed-copy"}},
			reader:          &countingOperatorReader{obj: operatorWithoutGateways(t)},
			gatewayRequired: true, reason: models.McpDeployReadinessNoGatewayAvailable, wantReads: 1, wantChecks: []string{"create team-ns"},
		},
		{
			name:            "OpenShift image with the operator not ready",
			query:           url.Values{"image": {openShiftMcpServerTestImage}},
			reader:          &countingOperatorReader{obj: operatorNotReady(t)},
			gatewayRequired: true, reason: models.McpDeployReadinessOperatorNotReady, wantReads: 1, wantChecks: []string{"create team-ns"},
		},
		{
			name:            "OpenShift image when the CR cannot be read",
			query:           url.Values{"image": {openShiftMcpServerTestImage}},
			reader:          &countingOperatorReader{err: errors.New("forbidden")},
			gatewayRequired: true, reason: models.McpDeployReadinessGatewayStatusUnavailable, wantReads: 1, wantChecks: []string{"create team-ns"},
		},
		{
			name:       "other image registered under the OpenShift server name is not gated",
			query:      url.Values{"image": {"quay.io/example/other:1.0"}, "registryServer": {openShiftMcpServerCatalogName}},
			reader:     &countingOperatorReader{err: errors.New("must not be called")},
			deployable: true, wantReads: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, client := newMcpDeployGateTestApp(t, tt.reader, true)
			tt.query.Set("namespace", "team-ns")
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, deployReadinessPath(tt.query), nil))

			require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
			var envelope McpServerDeployReadinessEnvelope
			require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &envelope))
			assert.Equal(t, tt.gatewayRequired, envelope.Data.GatewayRequired)
			assert.Equal(t, tt.deployable, envelope.Data.Deployable)
			assert.Equal(t, tt.reason, envelope.Data.Reason)
			assert.Equal(t, tt.wantReads, tt.reader.calls.Load())
			assert.Equal(t, tt.wantChecks, client.recordedChecks())
		})
	}
}

// Other images need no gateway, so a caller who cannot create MCP servers (or whose
// access check fails) still gets a normal answer instead of an error on every server.
func TestMcpDeployReadinessOtherImageSkipsAccessCheck(t *testing.T) {
	for name, client := range map[string]*mcpServersAccessKubeClient{
		"caller cannot create": {allow: false},
		"access check fails":   {checkErr: errors.New("SSAR failed")},
	} {
		t.Run(name, func(t *testing.T) {
			reader := &countingOperatorReader{err: errors.New("must not be called")}
			handler, client := newMcpDeployGateTestAppWithClient(t, reader, client)
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, deployReadinessPath(url.Values{
				"namespace": {"team-ns"}, "image": {"quay.io/example/other:1.0"},
			}), nil))

			require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
			var envelope McpServerDeployReadinessEnvelope
			require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &envelope))
			assert.Equal(t, models.McpServerDeployReadiness{Deployable: true}, envelope.Data)
			assert.Empty(t, client.recordedChecks())
			assert.Zero(t, reader.calls.Load())
		})
	}
}

func TestMcpDeployReadinessErrors(t *testing.T) {
	tests := []struct {
		name   string
		query  url.Values
		allow  bool
		status int
	}{
		{name: "missing image", query: url.Values{"namespace": {"team-ns"}, "registryServer": {openShiftMcpServerCatalogName}}, allow: true, status: http.StatusBadRequest},
		{name: "missing namespace", query: url.Values{"image": {openShiftMcpServerTestImage}}, allow: true, status: http.StatusBadRequest},
		{name: "caller cannot deploy to the namespace", query: url.Values{"namespace": {"team-ns"}, "image": {openShiftMcpServerTestImage}}, allow: false, status: http.StatusForbidden},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reader := &countingOperatorReader{obj: redhatrepos.NewMockMCPLifecycleOperator()}
			handler, _ := newMcpDeployGateTestApp(t, reader, tt.allow)
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, deployReadinessPath(tt.query), nil))

			assert.Equal(t, tt.status, rr.Code, rr.Body.String())
			assert.Zero(t, reader.calls.Load(), "the gateway status must not be read")
		})
	}
}

func TestMcpDeploymentCreateGatewayGate(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		reader     *countingOperatorReader
		allow      bool
		status     int
		wantCreate bool
		wantReads  int32
		wantChecks []string
	}{
		{
			name:   "OpenShift image without a gateway is rejected",
			body:   `{"data":{"image":"` + openShiftMcpServerTestImage + `"}}`,
			reader: &countingOperatorReader{obj: operatorWithoutGateways(t)},
			allow:  true, status: http.StatusConflict, wantReads: 1, wantChecks: []string{"create team-ns"},
		},
		{
			name:   "renamed registration of the OpenShift image with the operator not ready is rejected",
			body:   `{"data":{"registryServer":"io.example/renamed-copy","image":"` + openShiftMcpServerTestImage + `"}}`,
			reader: &countingOperatorReader{obj: operatorNotReady(t)},
			allow:  true, status: http.StatusConflict, wantReads: 1, wantChecks: []string{"create team-ns"},
		},
		{
			name:   "OpenShift image is rejected when the gateway status cannot be read",
			body:   `{"data":{"image":"` + openShiftMcpServerTestImage + `"}}`,
			reader: &countingOperatorReader{err: errors.New("forbidden")},
			allow:  true, status: http.StatusConflict, wantReads: 1, wantChecks: []string{"create team-ns"},
		},
		{
			name:   "other image registered under the OpenShift server name is created without reading the CR",
			body:   `{"data":{"registryServer":"` + openShiftMcpServerCatalogName + `","image":"quay.io/example/other:1.0"}}`,
			reader: &countingOperatorReader{err: errors.New("must not be called")},
			allow:  true, status: http.StatusCreated, wantCreate: true,
		},
		{
			name:   "OpenShift image with a usable gateway is created",
			body:   `{"data":{"image":"` + openShiftMcpServerTestImage + `"}}`,
			reader: &countingOperatorReader{obj: redhatrepos.NewMockMCPLifecycleOperator()},
			allow:  true, status: http.StatusCreated, wantCreate: true, wantReads: 1, wantChecks: []string{"create team-ns"},
		},
		{
			name:   "other server is created without reading the CR",
			body:   `{"data":{"image":"quay.io/example/other:1.0"}}`,
			reader: &countingOperatorReader{err: errors.New("must not be called")},
			allow:  true, status: http.StatusCreated, wantCreate: true,
		},
		{
			name:   "OpenShift image for a caller who cannot create does not reveal the gateway status",
			body:   `{"data":{"image":"` + openShiftMcpServerTestImage + `"}}`,
			reader: &countingOperatorReader{obj: operatorWithoutGateways(t)},
			allow:  false, status: http.StatusForbidden, wantChecks: []string{"create team-ns"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var creates atomic.Int32
			withMcpDeploymentRepo(t, &mockMcpDeploymentRepo{
				createFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace string, req models.McpDeploymentCreateRequest) (models.McpDeployment, error) {
					creates.Add(1)
					return models.McpDeployment{Name: "mcp-test", Namespace: namespace, Image: req.Image}, nil
				},
			})
			handler, client := newMcpDeployGateTestApp(t, tt.reader, tt.allow)

			req := httptest.NewRequest(http.MethodPost, api.McpDeploymentListPath+"?namespace=team-ns", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			require.Equal(t, tt.status, rr.Code, rr.Body.String())
			if tt.status == http.StatusConflict {
				assert.Contains(t, rr.Body.String(), "This MCP server requires an MCP gateway.")
			}
			assert.Equal(t, tt.wantCreate, creates.Load() == 1)
			assert.Equal(t, tt.wantReads, tt.reader.calls.Load())
			assert.Equal(t, tt.wantChecks, client.recordedChecks())
		})
	}
}

func TestMcpDeploymentCreateGatewayGateAccessCheckError(t *testing.T) {
	var creates atomic.Int32
	withMcpDeploymentRepo(t, &mockMcpDeploymentRepo{
		createFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace string, req models.McpDeploymentCreateRequest) (models.McpDeployment, error) {
			creates.Add(1)
			return models.McpDeployment{Name: "mcp-test", Namespace: namespace, Image: req.Image}, nil
		},
	})
	reader := &countingOperatorReader{obj: redhatrepos.NewMockMCPLifecycleOperator()}
	handler, _ := newMcpDeployGateTestAppWithClient(t, reader, &mcpServersAccessKubeClient{checkErr: errors.New("SSAR failed")})

	req := httptest.NewRequest(http.MethodPost, api.McpDeploymentListPath+"?namespace=team-ns",
		strings.NewReader(`{"data":{"image":"`+openShiftMcpServerTestImage+`"}}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusForbidden, rr.Code, rr.Body.String())
	assert.Zero(t, creates.Load(), "nothing must be created")
	assert.Zero(t, reader.calls.Load(), "the gateway status must not be read")
}

func TestMcpDeploymentUpdateGatewayGate(t *testing.T) {
	const otherImage = "quay.io/example/other:1.0"
	tests := []struct {
		name         string
		currentImage string
		body         string
		reader       *countingOperatorReader
		allow        bool
		status       int
		wantUpdate   bool
		wantGets     int32
		wantReads    int32
		wantChecks   []string
	}{
		{
			name:         "switching to the OpenShift image without a gateway is rejected",
			currentImage: otherImage,
			body:         `{"data":{"image":"` + openShiftMcpServerTestImage + `"}}`,
			reader:       &countingOperatorReader{obj: operatorWithoutGateways(t)},
			allow:        true, status: http.StatusConflict, wantGets: 1, wantReads: 1, wantChecks: []string{"patch team-ns"},
		},
		{
			name:         "switching to the OpenShift image is rejected when the gateway status cannot be read",
			currentImage: otherImage,
			body:         `{"data":{"image":"` + openShiftMcpServerTestImage + `"}}`,
			reader:       &countingOperatorReader{err: errors.New("forbidden")},
			allow:        true, status: http.StatusConflict, wantGets: 1, wantReads: 1, wantChecks: []string{"patch team-ns"},
		},
		{
			name:         "switching to the OpenShift image with a usable gateway is allowed",
			currentImage: otherImage,
			body:         `{"data":{"image":"` + openShiftMcpServerTestImage + `"}}`,
			reader:       &countingOperatorReader{obj: redhatrepos.NewMockMCPLifecycleOperator()},
			allow:        true, status: http.StatusOK, wantUpdate: true, wantGets: 1, wantReads: 1, wantChecks: []string{"patch team-ns"},
		},
		{
			name:         "switching to the OpenShift image for a caller who cannot update does not reveal the gateway status",
			currentImage: otherImage,
			body:         `{"data":{"image":"` + openShiftMcpServerTestImage + `"}}`,
			reader:       &countingOperatorReader{obj: operatorWithoutGateways(t)},
			allow:        false, status: http.StatusForbidden, wantChecks: []string{"patch team-ns"},
		},
		{
			name:         "editing an existing OpenShift deployment without a gateway is allowed",
			currentImage: openShiftMcpServerTestImage,
			body:         `{"data":{"displayName":"Renamed","image":"` + openShiftMcpServerTestImage + `","yaml":"config:\n  port: 8080\n"}}`,
			reader:       &countingOperatorReader{err: errors.New("must not be called")},
			allow:        true, status: http.StatusOK, wantUpdate: true, wantGets: 1, wantChecks: []string{"patch team-ns"},
		},
		{
			name:         "changing to another image is not gated",
			currentImage: otherImage,
			body:         `{"data":{"image":"quay.io/example/other:2.0"}}`,
			reader:       &countingOperatorReader{err: errors.New("must not be called")},
			allow:        true, status: http.StatusOK, wantUpdate: true,
		},
		{
			name:         "an update without an image is not gated",
			currentImage: otherImage,
			body:         `{"data":{"displayName":"Renamed"}}`,
			reader:       &countingOperatorReader{err: errors.New("must not be called")},
			allow:        true, status: http.StatusOK, wantUpdate: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var gets, updates atomic.Int32
			withMcpDeploymentRepo(t, &mockMcpDeploymentRepo{
				getFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace, name string) (models.McpDeployment, error) {
					gets.Add(1)
					return models.McpDeployment{Name: name, Namespace: namespace, Image: tt.currentImage}, nil
				},
				updateFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace, name string, _ models.McpDeploymentUpdateRequest) (models.McpDeployment, error) {
					updates.Add(1)
					return models.McpDeployment{Name: name, Namespace: namespace}, nil
				},
			})
			handler, client := newMcpDeployGateTestApp(t, tt.reader, tt.allow)

			req := httptest.NewRequest(http.MethodPatch, api.McpDeploymentListPath+"/mcp-test?namespace=team-ns", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			require.Equal(t, tt.status, rr.Code, rr.Body.String())
			if tt.status == http.StatusConflict {
				assert.Contains(t, rr.Body.String(), "This MCP server requires an MCP gateway.")
			}
			assert.Equal(t, tt.wantUpdate, updates.Load() == 1)
			assert.Equal(t, tt.wantGets, gets.Load())
			assert.Equal(t, tt.wantReads, tt.reader.calls.Load())
			assert.Equal(t, tt.wantChecks, client.recordedChecks())
		})
	}
}

func TestMcpDeploymentUpdateGatewayGateDeploymentNotFound(t *testing.T) {
	var updates atomic.Int32
	withMcpDeploymentRepo(t, &mockMcpDeploymentRepo{
		getFn: func(context.Context, k8s.KubernetesClientInterface, string, string) (models.McpDeployment, error) {
			return models.McpDeployment{}, redhatrepos.ErrMcpDeploymentNotFound
		},
		updateFn: func(context.Context, k8s.KubernetesClientInterface, string, string, models.McpDeploymentUpdateRequest) (models.McpDeployment, error) {
			updates.Add(1)
			return models.McpDeployment{}, nil
		},
	})
	reader := &countingOperatorReader{obj: redhatrepos.NewMockMCPLifecycleOperator()}
	handler, _ := newMcpDeployGateTestApp(t, reader, true)

	req := httptest.NewRequest(http.MethodPatch, api.McpDeploymentListPath+"/missing?namespace=team-ns",
		strings.NewReader(`{"data":{"image":"`+openShiftMcpServerTestImage+`"}}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code, rr.Body.String())
	assert.Zero(t, updates.Load(), "nothing must be updated")
	assert.Zero(t, reader.calls.Load(), "the gateway status must not be read")
}

// The repository applies updates as a Kubernetes patch, so the gate checks the patch verb:
// a caller who may patch but not update can switch images, and the reverse cannot.
func TestMcpDeploymentUpdateGatewayGateChecksPatchVerb(t *testing.T) {
	tests := []struct {
		name       string
		verbs      map[string]bool
		status     int
		wantUpdate bool
		wantReads  int32
	}{
		{name: "patch allowed, update denied", verbs: map[string]bool{"patch": true}, status: http.StatusOK, wantUpdate: true, wantReads: 1},
		{name: "update allowed, patch denied", verbs: map[string]bool{"update": true}, status: http.StatusForbidden},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var updates atomic.Int32
			withMcpDeploymentRepo(t, &mockMcpDeploymentRepo{
				getFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace, name string) (models.McpDeployment, error) {
					return models.McpDeployment{Name: name, Namespace: namespace, Image: "quay.io/example/other:1.0"}, nil
				},
				updateFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace, name string, _ models.McpDeploymentUpdateRequest) (models.McpDeployment, error) {
					updates.Add(1)
					return models.McpDeployment{Name: name, Namespace: namespace}, nil
				},
			})
			reader := &countingOperatorReader{obj: redhatrepos.NewMockMCPLifecycleOperator()}
			handler, _ := newMcpDeployGateTestAppWithClient(t, reader, &mcpServersAccessKubeClient{allowVerbs: tt.verbs})

			req := httptest.NewRequest(http.MethodPatch, api.McpDeploymentListPath+"/mcp-test?namespace=team-ns",
				strings.NewReader(`{"data":{"image":"`+openShiftMcpServerTestImage+`"}}`))
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			assert.Equal(t, tt.status, rr.Code, rr.Body.String())
			assert.Equal(t, tt.wantUpdate, updates.Load() == 1)
			assert.Equal(t, tt.wantReads, reader.calls.Load())
		})
	}
}

// A caller who may patch but cannot read the current deployment gets the Kubernetes error
// for the read, and nothing is updated or revealed.
func TestMcpDeploymentUpdateGatewayGateGetForbidden(t *testing.T) {
	var updates atomic.Int32
	withMcpDeploymentRepo(t, &mockMcpDeploymentRepo{
		getFn: func(context.Context, k8s.KubernetesClientInterface, string, string) (models.McpDeployment, error) {
			return models.McpDeployment{}, apierrors.NewForbidden(schema.GroupResource{Group: "mcp.x-k8s.io", Resource: "mcpservers"}, "mcp-test", errors.New("denied"))
		},
		updateFn: func(context.Context, k8s.KubernetesClientInterface, string, string, models.McpDeploymentUpdateRequest) (models.McpDeployment, error) {
			updates.Add(1)
			return models.McpDeployment{}, nil
		},
	})
	reader := &countingOperatorReader{obj: redhatrepos.NewMockMCPLifecycleOperator()}
	handler, _ := newMcpDeployGateTestApp(t, reader, true)

	req := httptest.NewRequest(http.MethodPatch, api.McpDeploymentListPath+"/mcp-test?namespace=team-ns",
		strings.NewReader(`{"data":{"image":"`+openShiftMcpServerTestImage+`"}}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusForbidden, rr.Code, rr.Body.String())
	assert.Zero(t, updates.Load(), "nothing must be updated")
	assert.Zero(t, reader.calls.Load(), "the gateway status must not be read")
}
