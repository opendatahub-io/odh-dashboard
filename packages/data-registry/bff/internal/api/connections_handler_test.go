package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"log/slog"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/data-registry/bff/internal/config"
	"github.com/opendatahub-io/data-registry/bff/internal/constants"
	"github.com/opendatahub-io/data-registry/bff/internal/integrations/bffclient"
	"github.com/opendatahub-io/data-registry/bff/internal/integrations/bffclient/bffmocks"
	"github.com/opendatahub-io/data-registry/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/data-registry/bff/internal/repositories"
	"github.com/stretchr/testify/require"
)

func TestConnectionsMockDCH(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	bffConfig := bffclient.NewDefaultBFFClientConfig()
	bffConfig.ServiceConfigs[bffclient.BFFTargetDCH] = &bffclient.BFFServiceConfig{ServiceName: "mock"}
	app := &App{config: config.EnvConfig{MockBFFClients: true}, logger: logger,
		repositories:     repositories.NewRepositories(),
		bffClientFactory: bffmocks.NewMockClientFactoryWithConfig(bffConfig, nil, false, logger)}
	req := httptest.NewRequest("GET", "/api/v1/connections/project-a", nil)
	req = req.WithContext(context.WithValue(req.Context(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{Token: "test-token"}))
	w := httptest.NewRecorder()
	app.GetConnectionsHandler(w, req, httprouter.Params{{Key: "namespace", Value: "project-a"}})
	require.Equal(t, 200, w.Code)
	var body ConnectionsEnvelope
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Len(t, body.Data, 1)
	require.Equal(t, "dch", body.Data[0].Type)
	require.Equal(t, "550e8400-e29b-41d4-a716-446655440000", body.Data[0].ID)
	require.Equal(t, "s3", *body.Data[0].ConnectionType)
}

// Embedded interfaces keep the fake focused on the operations exercised by this handler.
type connectionKubeClient struct {
	kubernetes.KubernetesClientInterface
	secrets   []corev1.Secret
	err       error
	namespace string
}

func (c *connectionKubeClient) GetConnections(_ context.Context, namespace string) ([]corev1.Secret, error) {
	c.namespace = namespace
	return c.secrets, c.err
}

type connectionKubeFactory struct {
	kubernetes.KubernetesClientFactory
	client *connectionKubeClient
	calls  int
}

func (f *connectionKubeFactory) GetClient(context.Context) (kubernetes.KubernetesClientInterface, error) {
	f.calls++
	return f.client, nil
}

type connectionBFFFactory struct {
	bffclient.BFFClientFactory
	client bffclient.BFFClientInterface
	token  string
}

func (f *connectionBFFFactory) IsTargetConfigured(bffclient.BFFTarget) bool { return f.client != nil }
func (f *connectionBFFFactory) CreateClient(_ bffclient.BFFTarget, token string) bffclient.BFFClientInterface {
	f.token = token
	return f.client
}

func TestConnectionsSourcePolicy(t *testing.T) {
	for _, tt := range []struct {
		name                string
		upstreamErr         error
		disabled, empty     bool
		secretErr           error
		status, secretCalls int
		source              string
	}{
		{name: "unconfigured uses secrets", disabled: true, status: 200, secretCalls: 1, source: "rhai"},
		{name: "DCH success loads RHOAI display details", status: 200, secretCalls: 1, source: "dch"},
		{name: "empty DCH loads RHOAI display details", empty: true, status: 200, secretCalls: 1},
		{name: "RHOAI display lookup failure preserves DCH results", secretErr: errors.New("RHOAI lookup failed"), status: 200, secretCalls: 1, source: "dch"},
		{name: "network fallback", upstreamErr: bffclient.NewConnectionError(bffclient.BFFTargetDCH, "private upstream detail"), status: 200, secretCalls: 1, source: "rhai"},
		{name: "timeout fallback", upstreamErr: bffclient.NewTimeoutError(bffclient.BFFTargetDCH), status: 200, secretCalls: 1, source: "rhai"},
		{name: "5xx fallback", upstreamErr: bffclient.NewServerUnavailableError(bffclient.BFFTargetDCH), status: 200, secretCalls: 1, source: "rhai"},
		{name: "unauthorized", upstreamErr: bffclient.NewUnauthorizedError(bffclient.BFFTargetDCH, "private upstream detail"), status: 401},
		{name: "forbidden", upstreamErr: bffclient.NewForbiddenError(bffclient.BFFTargetDCH, "private upstream detail"), status: 403},
		{name: "other 4xx", upstreamErr: bffclient.NewNotFoundError(bffclient.BFFTargetDCH, "private upstream detail"), status: 502},
		{name: "malformed is not upstream 5xx", upstreamErr: bffclient.NewInvalidResponseError(bffclient.BFFTargetDCH, "private upstream detail"), status: 502},
		{name: "fallback also fails", upstreamErr: bffclient.NewServerUnavailableError(bffclient.BFFTargetDCH), secretErr: errors.New("secret unavailable"), status: 500, secretCalls: 1},
		{name: "secret permission denied", disabled: true, secretErr: k8serrors.NewForbidden(schema.GroupResource{Resource: "secrets"}, "", errors.New("denied")), status: 403, secretCalls: 1},
	} {
		t.Run(tt.name, func(t *testing.T) {
			kube := &connectionKubeFactory{client: &connectionKubeClient{err: tt.secretErr, secrets: []corev1.Secret{{ObjectMeta: metav1.ObjectMeta{
				Name: "original-secret", Annotations: map[string]string{"openshift.io/display-name": "Display name", "opendatahub.io/connection-type-ref": "s3"},
			}}}}}
			factory := &connectionBFFFactory{}
			if !tt.disabled {
				client := bffmocks.NewMockBFFClient(bffclient.BFFTargetDCH)
				if tt.upstreamErr != nil || tt.empty {
					client.CallHandler = func(_ context.Context, _, _ string, _ interface{}, response interface{}) error {
						if tt.upstreamErr != nil {
							return tt.upstreamErr
						}
						return json.Unmarshal([]byte(`{"data":[]}`), response)
					}
				}
				factory.client = client
			}
			var logs bytes.Buffer
			app := &App{logger: slog.New(slog.NewTextHandler(&logs, nil)), repositories: repositories.NewRepositories(), kubernetesClientFactory: kube, bffClientFactory: factory}
			req := httptest.NewRequest("GET", "/api/v1/connections/project-a", nil)
			req = req.WithContext(context.WithValue(req.Context(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{Token: "user-token"}))
			w := httptest.NewRecorder()
			app.GetConnectionsHandler(w, req, httprouter.Params{{Key: "namespace", Value: "project-a"}})
			require.Equal(t, tt.status, w.Code, w.Body.String())
			require.Equal(t, tt.secretCalls, kube.calls)
			require.NotContains(t, w.Body.String(), "private upstream detail")
			require.NotContains(t, logs.String(), "private upstream detail")
			require.NotContains(t, logs.String(), "user-token")
			if !tt.disabled {
				require.Equal(t, "user-token", factory.token)
			}
			if tt.status == 200 {
				var envelope ConnectionsEnvelope
				require.NoError(t, json.Unmarshal(w.Body.Bytes(), &envelope))
				if tt.source != "" {
					require.Equal(t, tt.source, envelope.Data[0].Type)
				}
				if tt.source == "rhai" {
					require.Equal(t, "original-secret", envelope.Data[0].SecretName)
					require.Equal(t, "Display name", envelope.Data[0].Name)
					require.Equal(t, "project-a", kube.client.namespace)
				}
				if tt.empty {
					require.Empty(t, envelope.Data)
					require.NotNil(t, envelope.Metadata)
					require.Empty(t, envelope.Metadata.Warnings)
				}
				if !tt.disabled && tt.upstreamErr == nil {
					require.NotNil(t, envelope.Metadata)
					if tt.secretErr == nil {
						require.Len(t, envelope.Metadata.RhaiConnections, 1)
						require.Equal(t, "rhai", envelope.Metadata.RhaiConnections[0].Type)
						require.Equal(t, "original-secret", envelope.Metadata.RhaiConnections[0].SecretName)
						require.Equal(t, "Display name", envelope.Metadata.RhaiConnections[0].Name)
					} else {
						require.Empty(t, envelope.Metadata.RhaiConnections)
						require.Len(t, envelope.Metadata.Warnings, 1)
						require.Equal(t, "RHAI_LOOKUP_FAILED", envelope.Metadata.Warnings[0].Code)
					}
				}
			}
		})
	}
}
