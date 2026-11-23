package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/repositories"
	"k8s.io/apimachinery/pkg/util/validation"
)

type NamespaceAccessListEnvelope Envelope[models.NamespaceAccessList, None]
type NamespaceAccessEnvelope Envelope[models.NamespaceAccess, None]

// namespaceAccessErrorResponse keeps denial, failed review and failed discovery
// distinguishable: 403, 503 and 503 with a discovery cause, respectively. None of
// them carries a namespace name.
func (app *App) namespaceAccessErrorResponse(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, repositories.ErrNamespaceAccessDenied):
		app.forbiddenResponse(w, r, err)
	case errors.Is(err, repositories.ErrNamespaceNotFound):
		app.notFoundResponse(w, r)
	case errors.Is(err, repositories.ErrNamespaceAccessReviewFailed),
		errors.Is(err, repositories.ErrNamespaceDiscoveryUnavailable):
		app.serviceUnavailableResponse(w, r, err)
	default:
		app.serverErrorResponse(w, r, err)
	}
}

// namespaceDiscoveryUnavailableError is the 503 body for a discovery that
// decided nothing. Its issues say which source or review failed, so a client
// can tell a candidate-source failure from an authorization-service failure.
type namespaceDiscoveryUnavailableError struct {
	Error struct {
		httpcontract.ErrorPayload
		Issues []models.NamespaceDiscoveryIssue `json:"issues"`
	} `json:"error"`
}

func (app *App) namespaceDiscoveryUnavailableResponse(w http.ResponseWriter, r *http.Request, err error, issues []models.NamespaceDiscoveryIssue) {
	app.logRejection(r, err, http.StatusServiceUnavailable)
	var body namespaceDiscoveryUnavailableError
	body.Error.ErrorPayload = httpcontract.Local(http.StatusServiceUnavailable).Error
	body.Error.RequestID = httpcontract.EnsureID(w, r)
	body.Error.Issues = issues
	if body.Error.Issues == nil {
		body.Error.Issues = []models.NamespaceDiscoveryIssue{}
	}
	if writeErr := app.WriteJSON(w, http.StatusServiceUnavailable, body, nil); writeErr != nil {
		app.LogError(r, writeErr)
	}
}

// parseRequestedNamespaces reads the repeatable ?namespace= parameter.
func parseRequestedNamespaces(r *http.Request) ([]string, error) {
	values := r.URL.Query()["namespace"]
	if len(values) > repositories.MaxRequestedNamespaces {
		return nil, fmt.Errorf("too many namespace parameters")
	}
	for _, v := range values {
		if len(validation.IsDNS1123Label(v)) != 0 {
			return nil, fmt.Errorf("invalid namespace name")
		}
	}
	return values, nil
}

// GetNamespaceAccessHandler returns the namespaces the caller can use on xKS and
// the RHAII actions available in each.
func (app *App) GetNamespaceAccessHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		app.unauthorizedResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}
	requested, err := parseRequestedNamespaces(r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	list, err := app.repositories.NamespaceAccess.Discover(ctx, client, identity, requested)
	if errors.Is(err, repositories.ErrNamespaceDiscoveryUnavailable) {
		app.namespaceDiscoveryUnavailableResponse(w, r, err, list.Issues)
		return
	}
	if err != nil {
		app.namespaceAccessErrorResponse(w, r, err)
		return
	}
	if err := app.WriteJSON(w, http.StatusOK, NamespaceAccessListEnvelope{Data: list}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// GetNamespaceAccessByNameHandler evaluates one namespace for manual entry.
func (app *App) GetNamespaceAccessByNameHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		app.unauthorizedResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}
	name := ps.ByName("name")
	if len(validation.IsDNS1123Label(name)) != 0 {
		app.badRequestResponse(w, r, fmt.Errorf("invalid namespace name"))
		return
	}
	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	access, err := app.repositories.NamespaceAccess.Get(ctx, client, identity, name)
	if err != nil {
		app.namespaceAccessErrorResponse(w, r, err)
		return
	}
	if err := app.WriteJSON(w, http.StatusOK, NamespaceAccessEnvelope{Data: access}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
