package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/constants"
	k8s "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/models"
)

type ConnectionType = models.ConnectionType
type ConnectionTypeCredentialField = models.ConnectionTypeCredentialField
type ConnectionTypeField = models.ConnectionTypeField
type EnumValue = models.EnumValue

type ConnectionTypesEnvelope Envelope[[]ConnectionType, None]
type ConnectionTypeEnvelope Envelope[ConnectionType, None]

const ConnectionTypesPath = ApiPathPrefix + "/connection-types"
const ConnectionTypePath = ApiPathPrefix + "/connection-types/:connection_type_id"

func (app *App) GetConnectionTypesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
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
	if !app.authorizeNamespace(w, r, namespace, identity, "get", "data-connection-types") {
		return
	}

	repository, err := app.dataConnectHubRepository(r.Context(), identity, namespace)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	types, err := repository.ListConnectionTypes(r.Context())
	if err != nil {
		app.dataConnectHubErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, ConnectionTypesEnvelope{Data: types}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) GetConnectionTypeHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
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
	if !app.authorizeNamespace(w, r, namespace, identity, "get", "data-connection-types") {
		return
	}

	connectionTypeID := params.ByName("connection_type_id")
	if err := validateID("path parameter", "connection_type_id", connectionTypeID); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	repository, err := app.dataConnectHubRepository(r.Context(), identity, namespace)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	connectionType, err := repository.GetConnectionType(r.Context(), connectionTypeID)
	if err != nil {
		app.dataConnectHubErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, ConnectionTypeEnvelope{Data: connectionType}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
