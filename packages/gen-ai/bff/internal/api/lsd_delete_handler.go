package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type OGXServerDeleteEnvelope Envelope[*models.OGXServerDeleteResponse, None]

func (app *App) LlamaStackDistributionDeleteHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	namespace, ok := r.Context().Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in the context"))
		return
	}

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var deleteRequest models.OGXServerDeleteRequest
	if r.Body == nil {
		app.badRequestResponse(w, r, fmt.Errorf("request body is required"))
		return
	}
	if err := json.NewDecoder(r.Body).Decode(&deleteRequest); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid JSON in request body: %w", err))
		return
	}

	// Validate that the OGX server name which is to be deleted is not empty
	if len(deleteRequest.Name) == 0 {
		app.badRequestResponse(w, r, fmt.Errorf("ogx server name cannot be empty"))
		return
	}

	// By default pgvector is cleaned up (full playground delete). When the
	// frontend sends preserve_vector_store=true (reconfigure/model switch),
	// pgvector resources are kept so uploaded document embeddings survive.
	deletePgvector := deleteRequest.PreserveVectorStore == nil || !*deleteRequest.PreserveVectorStore

	response, err := app.repositories.OGXServer.DeleteOGXServer(client, ctx, identity, namespace, deleteRequest.Name, deletePgvector)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	envelope := OGXServerDeleteEnvelope{
		Data: response,
	}

	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.logger.Error("error encoding response", "error", err)
	}
}
