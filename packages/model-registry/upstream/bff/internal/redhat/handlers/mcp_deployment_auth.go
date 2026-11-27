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
// Read paths retain the existing user-token behavior. Mutation paths use the
// explicit helper below because the BFF performs ownership-scoped writes with
// its service account after authorizing the end user.
func requireMcpDeploymentAccess(app *api.App, w http.ResponseWriter, r *http.Request, namespace, verb string) bool {
	if app.Config().AuthMethod != config.AuthMethodInternal {
		return true
	}
	return requireMcpServersAccess(app, w, r, namespace, verb)
}

// requireMcpMutationAccess authorizes an end-user mutation before the BFF
// switches to its narrowly scoped service-account client. This is the
// separation required for a one-click installer: JayDilla does not need direct
// write access to the target project, and kube:admin is never used by the UI.
func requireMcpMutationAccess(app *api.App, w http.ResponseWriter, r *http.Request, namespace, verb string) bool {
	return requireMcpServersAccess(app, w, r, namespace, verb)
}

// requireMcpServersAccess checks that the requesting user has the given verb on
// mcpservers in the namespace, for every auth method. Use it when the handler reads
// data with the BFF service account instead of the user's token, so the K8s API
// server cannot enforce the user's permissions.
func requireMcpServersAccess(app *api.App, w http.ResponseWriter, r *http.Request, namespace, verb string) bool {
	client, err := getMcpAuthorizationClient(app, r)
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

func getMcpAuthorizationClient(app *api.App, r *http.Request) (k8s.KubernetesClientInterface, error) {
	// Tests and mocked environments deliberately use their injected client.
	if app.Config().MockK8Client {
		return app.KubernetesClientFactory().GetClient(r.Context())
	}
	// In user-token mode the token client can perform a SelfSubjectAccessReview,
	// which is the authoritative check for the caller. Token-based identities do
	// not carry a username in RequestIdentity; the API server derives it from the
	// forwarded bearer token. Using the internal client here would require that
	// username and produce an invalid SubjectAccessReview.
	if app.Config().AuthMethod == config.AuthMethodUser {
		return app.KubernetesClientFactory().GetClient(r.Context())
	}
	// The service account client submits a SAR for the end-user identity. This
	// keeps authorization independent from the user's ability to read or write
	// every prerequisite resource managed by the layer installer.
	return k8s.NewInternalKubernetesClient(app.Logger())
}

func getMcpMutationClient(app *api.App, w http.ResponseWriter, r *http.Request) (k8s.KubernetesClientInterface, bool) {
	if app.Config().MockK8Client {
		return getKubernetesClient(app, w, r)
	}
	client, err := k8s.NewInternalKubernetesClient(app.Logger())
	if err != nil {
		app.ServerError(w, r, fmt.Errorf("failed to get service account client for MCP mutation: %w", err))
		return nil, false
	}
	return client, true
}
