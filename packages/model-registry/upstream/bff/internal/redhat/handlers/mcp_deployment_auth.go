package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"

	authv1 "k8s.io/api/authorization/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"

	"github.com/kubeflow/model-registry/ui/bff/internal/api"
	"github.com/kubeflow/model-registry/ui/bff/internal/config"
	"github.com/kubeflow/model-registry/ui/bff/internal/constants"
	k8s "github.com/kubeflow/model-registry/ui/bff/internal/integrations/kubernetes"
)

const (
	mcpServerSARAPIGroup = "mcp.x-k8s.io"
	mcpServerSARResource = "mcpservers"
	sarRequestTimeout    = 30 * time.Second
)

var (
	sarClientOnce sync.Once
	sarClient     kubernetes.Interface
)

// initSARClient lazily initializes a typed K8s clientset using in-cluster config.
// Returns nil when not running in a cluster (e.g. federated/dev mode).
func initSARClient() kubernetes.Interface {
	sarClientOnce.Do(func() {
		cfg, err := rest.InClusterConfig()
		if err != nil {
			return
		}
		sarClient, _ = kubernetes.NewForConfig(cfg)
	})
	return sarClient
}

// requireMcpDeploymentAccess performs a SubjectAccessReview to verify that
// the requesting user has the given verb on mcpservers in the target namespace.
func requireMcpDeploymentAccess(app *api.App, w http.ResponseWriter, r *http.Request, namespace, verb string) bool {
	if app.Config().AuthMethod != config.AuthMethodInternal {
		return true
	}

	client := initSARClient()
	if client == nil {
		app.Logger().Warn("SAR client unavailable in internal auth mode, skipping access check")
		return true
	}

	identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	if !ok || identity == nil {
		app.BadRequest(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return false
	}

	ctx, cancel := context.WithTimeout(r.Context(), sarRequestTimeout)
	defer cancel()

	sar := &authv1.SubjectAccessReview{
		Spec: authv1.SubjectAccessReviewSpec{
			User:   identity.UserID,
			Groups: identity.Groups,
			ResourceAttributes: &authv1.ResourceAttributes{
				Verb:      verb,
				Group:     mcpServerSARAPIGroup,
				Resource:  mcpServerSARResource,
				Namespace: namespace,
			},
		},
	}

	response, err := client.AuthorizationV1().SubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		app.Logger().Error("SAR check failed",
			slog.String("user", identity.UserID),
			slog.String("verb", verb),
			slog.String("namespace", namespace),
			slog.Any("error", err),
		)
		app.Forbidden(w, r, fmt.Sprintf("access check failed for %s mcpservers in %s: %v", verb, namespace, err))
		return false
	}

	if !response.Status.Allowed {
		app.Logger().Warn("SAR denied",
			slog.String("user", identity.UserID),
			slog.String("verb", verb),
			slog.String("namespace", namespace),
		)
		app.Forbidden(w, r, fmt.Sprintf("user %s cannot %s mcpservers in namespace %s", identity.UserID, verb, namespace))
		return false
	}

	return true
}
