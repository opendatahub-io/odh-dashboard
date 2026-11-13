package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
	kubernetes "github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
)

type importCollectionRequest struct {
	Content string `json:"content"`
}

type importCollectionData struct {
	Collection evalhub.Collection `json:"collection"`
	Warnings   []string           `json:"warnings,omitempty"`
}

type ImportCollectionEnvelope Envelope[importCollectionData, None]

type importAccessData struct {
	Allowed bool `json:"allowed"`
}

type ImportAccessEnvelope Envelope[importAccessData, None]

// ImportCollectionHandler accepts raw YAML or JSON collection-definition
// content, parses it with safe-load semantics, runs mandatory-field checks and
// advisory warnings, and creates the collection by submitting to the EvalHub
// server's collections API — the same action validates and creates, so the
// server's response is authoritative and cannot drift from a BFF schema.
func (app *App) ImportCollectionHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)

	var input importCollectionRequest
	if err := app.ReadJSON(w, r, &input); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	doc, warnings, err := parseImportContent(input.Content)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	request, checkWarnings, err := buildImportCreateRequest(doc)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	warnings = append(warnings, checkWarnings...)

	collection, err := client.CreateCollection(ctx, namespace, request)
	if err != nil {
		app.evalHubErrorResponse(w, r, translateImportError(err), "failed to import collection")
		return
	}
	if collection == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("upstream returned empty response for collection"))
		return
	}
	if collection.Resource.ID == "" || collection.Name == "" {
		app.serverErrorResponse(w, r, fmt.Errorf("upstream returned collection with missing required fields (id=%q, name=%q)", collection.Resource.ID, collection.Name))
		return
	}

	envelope := ImportCollectionEnvelope{Data: importCollectionData{Collection: *collection, Warnings: warnings}}
	if err := app.WriteJSON(w, http.StatusCreated, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// ImportAccessHandler reports whether the current user may create collections
// in the namespace, so the UI can disable the import entry points with an
// informative tooltip instead of letting users enter a flow that fails on
// submission.
func (app *App) ImportAccessHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	identity := ctx.Value(constants.RequestIdentityKey)
	requestIdentity, ok := identity.(*kubernetes.RequestIdentity)
	if !ok || requestIdentity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	allowed, err := k8sClient.CanCreateEvalHubResources(ctx, requestIdentity, namespace)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to check collection creation permissions: %w", err))
		return
	}

	envelope := ImportAccessEnvelope{Data: importAccessData{Allowed: allowed}}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
