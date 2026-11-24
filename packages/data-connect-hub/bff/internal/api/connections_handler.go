package api

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/constants"
	k8s "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/models"
)

type Connection = models.Connection

type ConnectionsEnvelope Envelope[[]Connection, None]

const ConnectionsPath = ApiPathPrefix + "/connections"
const ConnectionPath = ApiPathPrefix + "/connections/:id"
const ConnectionNameAvailabilityPath = ApiPathPrefix + "/connection-name-availability"

type ConnectionNameAvailability struct {
	Available     bool     `json:"available"`
	ConflictsWith []string `json:"conflicts_with"`
}

type ConnectionNameAvailabilityEnvelope Envelope[ConnectionNameAvailability, None]

func (app *App) listConnections(
	ctx context.Context,
	identity *k8s.RequestIdentity,
	namespace string,
) ([]Connection, error) {
	repository, err := app.dataConnectHubRepository(ctx, identity, namespace)
	if err != nil {
		return nil, err
	}
	return repository.ListConnections(ctx)
}

func (app *App) GetConnectionsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	namespace := r.URL.Query().Get(string(constants.NamespaceHeaderParameterKey))
	if err := validateNamespace(namespace); err != nil {
		app.badRequestResponse(w, r, err)
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

	resolve, ok := app.resolveConnectionTypesParameter(w, r, namespace, identity)
	if !ok {
		return
	}
	repository, err := app.dataConnectHubRepository(r.Context(), identity, namespace)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	connections, err := repository.ListConnections(r.Context())
	if err == nil && resolve && len(connections) > 0 {
		err = resolveConnectionTypes(r.Context(), repository, connections)
	}
	if err != nil {
		app.dataConnectHubErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, ConnectionsEnvelope{Data: connections}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) GetConnectionHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	namespace := r.URL.Query().Get(string(constants.NamespaceHeaderParameterKey))
	if err := validateNamespace(namespace); err != nil {
		app.badRequestResponse(w, r, err)
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

	connectionID := params.ByName("id")
	if err := validateID("path parameter", "id", connectionID); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	connectionID = strings.ToLower(connectionID)

	resolve, ok := app.resolveConnectionTypesParameter(w, r, namespace, identity)
	if !ok {
		return
	}
	repository, err := app.dataConnectHubRepository(r.Context(), identity, namespace)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	connection, err := repository.GetConnection(r.Context(), connectionID)
	if err == nil && resolve {
		var connectionType ConnectionType
		connectionType, err = repository.GetConnectionType(r.Context(), connection.Resource.DataConnectionTypeID)
		if err == nil {
			if !strings.EqualFold(connectionType.Metadata.ID, connection.Resource.DataConnectionTypeID) || connectionType.Resource.Provider == "" {
				err = fmt.Errorf("invalid resolved connection type for %q", connection.Resource.DataConnectionTypeID)
			} else {
				connection.Resource.DataConnectionType = &connectionType
			}
		}
	}
	if err != nil {
		app.dataConnectHubErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, ConnectionResponse{Data: connection}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func normalizeConnectionProperties(connection *Connection) {
	if connection.Resource.Properties == nil {
		connection.Resource.Properties = map[string]string{}
	}
	connection.Resource.DataConnectionType = nil
}
