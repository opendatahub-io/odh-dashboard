package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/constants"
	k8s "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
	"k8s.io/apimachinery/pkg/util/validation"
)

func (app *App) ConnectionNameAvailabilityHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	namespace := r.URL.Query().Get(string(constants.NamespaceHeaderParameterKey))
	if err := validateNamespace(namespace); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	name := r.URL.Query().Get("name")
	if errors := validation.IsDNS1123Label(name); len(errors) > 0 {
		app.badRequestResponse(w, r, fmt.Errorf("invalid name: must be a valid RFC 1123 DNS label"))
		return
	}

	identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}
	if !app.authorizeNamespace(w, r, namespace, identity, "get", "data-connections") {
		return
	}

	if app.kubernetesClientFactory == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("Kubernetes client is not configured"))
		return
	}

	if app.config.MockK8Client && app.config.MockHTTPClient {
		availability, err := app.mockConnectionNameAvailability(r, namespace, name)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
		if err := app.WriteJSON(w, http.StatusOK, ConnectionNameAvailabilityEnvelope{Data: availability}, nil); err != nil {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	client, err := app.kubernetesClientFactory.GetClient(r.Context())
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}
	if !app.authorizeResource(w, r, namespace, identity, "get", "", "secrets") {
		return
	}

	connections, err := app.listConnections(r.Context(), identity, namespace)
	if err != nil {
		if app.upstreamErrorResponse(w, r, err) {
			return
		}
		app.serverErrorResponse(w, r, fmt.Errorf("failed to list data connections: %w", err))
		return
	}

	conflicts := make([]string, 0, 2)
	for _, connection := range connections {
		if connection.Resource.Name == name {
			conflicts = append(conflicts, "connection")
			break
		}
	}

	secretExists, err := client.SecretExists(r.Context(), namespace, name)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to check secret name: %w", err))
		return
	}
	if secretExists {
		conflicts = append(conflicts, "secret")
	}

	availability := ConnectionNameAvailability{
		Available:     len(conflicts) == 0,
		ConflictsWith: conflicts,
	}
	if err := app.WriteJSON(w, http.StatusOK, ConnectionNameAvailabilityEnvelope{Data: availability}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) mockConnectionNameAvailability(r *http.Request, namespace, name string) (ConnectionNameAvailability, error) {
	client, err := app.kubernetesClientFactory.GetClient(r.Context())
	if err != nil {
		return ConnectionNameAvailability{}, err
	}
	conflicts := make([]string, 0, 2)
	for _, connection := range mockConnections(namespace) {
		if connection.Resource.Name == name {
			conflicts = append(conflicts, "connection")
			break
		}
	}
	secretExists, err := client.SecretExists(r.Context(), namespace, name)
	if err != nil {
		return ConnectionNameAvailability{}, err
	}
	if secretExists {
		conflicts = append(conflicts, "secret")
	}
	return ConnectionNameAvailability{Available: len(conflicts) == 0, ConflictsWith: conflicts}, nil
}
