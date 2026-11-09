//go:build contract

package api

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/repositories"
	"github.com/stretchr/testify/require"
	authv1 "k8s.io/api/authorization/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/dynamic/fake"
	k8sclient "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	k8stesting "k8s.io/client-go/testing"
)

// TestNativeContractFixtureServer exercises production auth and status with controlled Kubernetes replies.
func TestNativeContractFixtureServer(t *testing.T) {
	if os.Getenv("CONTRACT_FIXTURE_SERVER") != "true" {
		t.Skip("managed by the central contract runner")
	}
	upstream := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if strings.HasSuffix(r.URL.Path, "/selfsubjectreviews") {
			username := "user"
			if token == "unresolved" {
				username = ""
			}
			_, _ = fmt.Fprintf(w, `{"apiVersion":"authentication.k8s.io/v1","kind":"SelfSubjectReview","status":{"userInfo":{"username":%q}}}`, username)
			return
		}
		if token == "review-failure" {
			w.WriteHeader(http.StatusForbidden)
			_, _ = w.Write([]byte(`{"apiVersion":"v1","kind":"Status","status":"Failure","code":403,"reason":"Forbidden","message":"CANARY"}`))
			return
		}
		var review authv1.SelfSubjectAccessReview
		body, err := io.ReadAll(r.Body)
		require.NoError(t, err)
		_, _, err = scheme.Codecs.UniversalDeserializer().Decode(body, nil, &review)
		require.NoError(t, err)
		if token == "admin-review-failure" && review.Spec.ResourceAttributes.Verb == "patch" {
			w.WriteHeader(http.StatusForbidden)
			_, _ = w.Write([]byte(`{"apiVersion":"v1","kind":"Status","status":"Failure","code":403,"reason":"Forbidden","message":"CANARY"}`))
			return
		}
		allowed := (token == "allowed" || token == "admin-review-failure") && review.Spec.ResourceAttributes.Verb == "get"
		_, _ = fmt.Fprintf(w, `{"apiVersion":"authorization.k8s.io/v1","kind":"SelfSubjectAccessReview","status":{"allowed":%t,"evaluationError":"CANARY"}}`, allowed)
	}))
	t.Cleanup(upstream.Close)
	app := newTestApp()
	app.config.AuthMethod = config.AuthMethodUser
	factory := k8s.NewTokenClientFactory(app.logger, app.config).(*k8s.TokenClientFactory)
	factory.NewTokenKubernetesClientFn = func(ctx context.Context, token string, logger *slog.Logger) (k8s.KubernetesClientInterface, error) {
		cfg := &rest.Config{Host: upstream.URL, BearerToken: token, Transport: upstream.Client().Transport}
		cfg.Wrap(httpcontract.WrapTransport)
		client, err := k8sclient.NewForConfig(cfg)
		return &k8s.TokenKubernetesClient{SharedClientLogic: k8s.SharedClientLogic{Client: client, Logger: logger, RestConfig: cfg}}, err
	}
	app.kubernetesClientFactory = factory
	dynamicClient := fake.NewSimpleDynamicClient(runtime.NewScheme())
	dynamicClient.PrependReactor("get", "auths", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewForbidden(models.AuthGVR.GroupResource(), models.AuthInstanceName, fmt.Errorf("CANARY"))
	})
	app.repositories.Status = repositories.NewStatusRepository(nil, "project", repositories.NewAuthRepository(dynamicClient))
	server := httptest.NewServer(app.Routes())
	t.Cleanup(server.Close)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	fmt.Println(server.URL)
	<-ctx.Done()
}
