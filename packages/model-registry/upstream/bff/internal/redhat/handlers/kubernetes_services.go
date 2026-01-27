package handlers

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"

	"github.com/kubeflow/model-registry/ui/bff/internal/api"
	"github.com/kubeflow/model-registry/ui/bff/internal/constants"
)

// KubernetesServicesListEnvelope is the response envelope for listing Kubernetes services.
type KubernetesServicesListEnvelope api.Envelope[[]KubernetesServiceItem, api.None]

// KubernetesServiceItem represents a Kubernetes service in the list response.
type KubernetesServiceItem struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Labels    map[string]string `json:"labels,omitempty"`
}

const (
	kubernetesServicesListHandlerID = api.HandlerID("kubernetes:services:list")
)

func init() {
	api.RegisterHandlerOverride(kubernetesServicesListHandlerID, overrideKubernetesServicesList)
}

// overrideKubernetesServicesList provides the downstream implementation for listing Kubernetes services
// with an optional label selector filter.
func overrideKubernetesServicesList(app *api.App, buildDefault func() httprouter.Handle) httprouter.Handle {
	if !shouldUseRedHatOverrides(app) {
		return buildDefault()
	}

	return app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		namespace, ok := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
		if !ok || namespace == "" {
			app.BadRequest(w, r, fmt.Errorf("missing namespace in the context"))
			return
		}

		client, err := app.KubernetesClientFactory().GetClient(r.Context())
		if err != nil {
			app.ServerError(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
			return
		}

		// Get optional label selector from query params
		// Example: ?labelSelector=app=model-registry
		_ = r.URL.Query().Get("labelSelector")

		// Use the existing GetServiceDetails method which lists services in the namespace
		// Note: The current interface doesn't support label filtering, so we return all services.
		// A future enhancement could add a method like ListServicesWithLabels to the interface.
		services, err := client.GetServiceDetails(r.Context(), namespace)
		if err != nil {
			app.ServerError(w, r, fmt.Errorf("failed to list services: %w", err))
			return
		}

		// Convert to response format
		items := make([]KubernetesServiceItem, 0, len(services))
		for _, svc := range services {
			items = append(items, KubernetesServiceItem{
				Name:      svc.Name,
				Namespace: namespace,
				// Labels are not available in ServiceDetails, leaving empty for now
				Labels: nil,
			})
		}

		resp := KubernetesServicesListEnvelope{Data: items}
		if err := app.WriteJSON(w, http.StatusOK, resp, nil); err != nil {
			app.ServerError(w, r, err)
		}
	})
}
