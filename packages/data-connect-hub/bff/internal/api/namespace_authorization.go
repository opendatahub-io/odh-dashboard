package api

import (
	"fmt"
	"net/http"

	"github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
	"k8s.io/apimachinery/pkg/util/validation"
)

func validateNamespace(namespace string) error {
	if namespace == "" {
		return fmt.Errorf("missing required query parameter: namespace")
	}
	if errors := validation.IsDNS1123Label(namespace); len(errors) > 0 {
		return fmt.Errorf("invalid namespace %q: must be a valid RFC 1123 DNS label", namespace)
	}
	return nil
}

func (app *App) authorizeNamespace(w http.ResponseWriter, r *http.Request, namespace string, identity *kubernetes.RequestIdentity, verb, resource string) bool {
	if app.config.MockK8Client {
		return true
	}
	if app.kubernetesClientFactory == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("Kubernetes client is not configured"))
		return false
	}
	client, err := app.kubernetesClientFactory.GetClient(r.Context())
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return false
	}
	allowed, err := client.CanAccessResource(
		r.Context(), identity, namespace, verb, "dataconnecthub.opendatahub.io", resource,
	)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to check namespace access: %w", err))
		return false
	}
	if allowed {
		return true
	}
	app.forbiddenResponse(w, r, fmt.Sprintf("user does not have access to namespace %q", namespace))
	return false
}
