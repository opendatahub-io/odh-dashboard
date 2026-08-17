package api

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/opendatahub-io/mlflow/bff/internal/config"
	k8s "github.com/opendatahub-io/mlflow/bff/internal/integrations/kubernetes"
)

// resourceWriteChecker checks whether the current user can perform verb on
// the given namespace for a specific resource type. Implementations are
// typically a method value bound to a k8s.KubernetesClientInterface, e.g.
// k8sClient.CanWritePromptsInNamespace or k8sClient.CanWriteMCPServersInNamespace.
type resourceWriteChecker func(ctx context.Context, namespace, verb string) (bool, error)

// enforceResourceWritePermission is the shared implementation backing
// enforceWritePermission (prompts_handler.go) and enforceMCPWritePermission
// (mcp_registry_handler.go). It centralizes the auth-disabled bypass,
// k8s-client-fetch-error handling, invalid-verb branch, and forbidden-response
// shape that were previously duplicated per resource type. deniedMessage is
// used in the 403 response body when permission is denied.
// Returns true if allowed, false if denied or an error occurred (response
// already written).
func (app *App) enforceResourceWritePermission(
	ctx context.Context,
	w http.ResponseWriter,
	r *http.Request,
	workspace string,
	verb string,
	resource string,
	deniedMessage string,
	check func(k8sClient k8s.KubernetesClientInterface) resourceWriteChecker,
) bool {
	if app.config.AuthMethod == config.AuthMethodDisabled {
		app.logger.Warn("Skipping permission check (auth disabled)",
			slog.String("workspace", workspace))
		return true
	}

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.logger.Error("Failed to get Kubernetes client",
			slog.String("workspace", workspace),
			slog.Any("error", err))
		app.serverErrorResponse(w, r, err)
		return false
	}

	canWrite, err := check(k8sClient)(ctx, workspace, verb)
	if err != nil {
		var invalidVerbErr *k8s.InvalidVerbError
		if errors.As(err, &invalidVerbErr) {
			app.logger.Error("BUG: Invalid verb passed to permission check",
				slog.String("workspace", workspace),
				slog.String("verb", verb),
				slog.Any("error", err))
		} else {
			app.logger.Error("Failed to check write permissions",
				slog.String("workspace", workspace),
				slog.Any("error", err))
		}
		app.serverErrorResponse(w, r, err)
		return false
	}

	if !canWrite {
		app.logger.Warn("Permission denied",
			slog.String("workspace", workspace),
			slog.String("verb", verb),
			slog.String("resource", resource),
			slog.String("required_role", "mlflow-edit"))
		app.forbiddenResponse(w, r, errors.New(deniedMessage))
		return false
	}

	return true
}
