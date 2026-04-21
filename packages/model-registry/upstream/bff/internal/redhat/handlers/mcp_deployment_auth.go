package handlers

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/kubeflow/model-registry/ui/bff/internal/api"
	"github.com/kubeflow/model-registry/ui/bff/internal/constants"
	k8s "github.com/kubeflow/model-registry/ui/bff/internal/integrations/kubernetes"
)

// requireMcpDeploymentAccess performs a permission check to verify that the
// requesting user has the given verb on mcpservers in the target namespace.
// The check is delegated to KubernetesClientInterface.CanVerbMcpServersInNamespace,
// which uses SAR (internal auth) or SSAR (user-token auth) as appropriate.
func requireMcpDeploymentAccess(app *api.App, w http.ResponseWriter, r *http.Request, namespace, verb string) bool {
	client, err := app.KubernetesClientFactory().GetClient(r.Context())
	if err != nil {
		app.ServerError(w, r, fmt.Errorf("failed to get Kubernetes client for MCP access check: %w", err))
		return false
	}
	if client == nil {
		app.ServerError(w, r, fmt.Errorf("kubernetes client factory returned nil client without error"))
		return false
	}

	identity, _ := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)

	allowed, err := client.CanVerbMcpServersInNamespace(r.Context(), identity, namespace, verb)
	if err != nil {
		userID := ""
		if identity != nil {
			userID = identity.UserID
		}
		app.Logger().Error("MCP server access check failed",
			slog.String("user", userID),
			slog.String("verb", verb),
			slog.String("namespace", namespace),
			slog.Any("error", err),
		)
		app.Forbidden(w, r, fmt.Sprintf("access check failed for %s mcpservers in %s: %v", verb, namespace, err))
		return false
	}

	if !allowed {
		userID := ""
		if identity != nil {
			userID = identity.UserID
		}
		app.Logger().Warn("MCP server access denied",
			slog.String("user", userID),
			slog.String("verb", verb),
			slog.String("namespace", namespace),
		)
		app.Forbidden(w, r, fmt.Sprintf("user %s cannot %s mcpservers in namespace %s", userID, verb, namespace))
		return false
	}

	return true
}
