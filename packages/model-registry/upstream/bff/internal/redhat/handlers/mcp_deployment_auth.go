package handlers

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/kubeflow/hub/ui/bff/internal/api"
	"github.com/kubeflow/hub/ui/bff/internal/config"
	"github.com/kubeflow/hub/ui/bff/internal/constants"
	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
)

// requireMcpDeploymentAccess performs a permission check to verify that the
// requesting user has the given verb on mcpservers in the target namespace.
// SAR is only performed when the auth method is "internal" (in-cluster service
// account). For user-token auth the K8s API server enforces authorization via
// the user's own bearer token, so no server-side SAR is needed.
func requireMcpDeploymentAccess(app *api.App, w http.ResponseWriter, r *http.Request, namespace, verb string) bool {
	if app.Config().AuthMethod != config.AuthMethodInternal {
		return true
	}

	client, err := app.KubernetesClientFactory().GetClient(r.Context())
	if err != nil {
		app.ServerError(w, r, fmt.Errorf("failed to get Kubernetes client for MCP access check: %w", err))
		return false
	}
	if client == nil {
		app.ServerError(w, r, fmt.Errorf("kubernetes client factory returned nil client without error"))
		return false
	}

	identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	if !ok || identity == nil {
		app.BadRequest(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return false
	}

	allowed, err := client.CanVerbMcpServersInNamespace(r.Context(), identity, namespace, verb)
	if err != nil {
		app.Logger().Error("MCP server access check failed",
			slog.String("user", identity.UserID),
			slog.String("verb", verb),
			slog.String("namespace", namespace),
			slog.Any("error", err),
		)
		app.Forbidden(w, r, fmt.Sprintf("access check failed for %s mcpservers in %s: %v", verb, namespace, err))
		return false
	}

	if !allowed {
		app.Logger().Warn("MCP server access denied",
			slog.String("user", identity.UserID),
			slog.String("verb", verb),
			slog.String("namespace", namespace),
		)
		app.Forbidden(w, r, fmt.Sprintf("user %s cannot %s mcpservers in namespace %s", identity.UserID, verb, namespace))
		return false
	}

	return true
}
