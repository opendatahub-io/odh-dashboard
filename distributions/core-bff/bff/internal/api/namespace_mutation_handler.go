package api

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
)

// NamespaceMutationHandler handles GET /api/namespaces/:name/:context.
// Applies model-serving-platform label/annotation mutations to a namespace.
// Context 0 (DSG_CREATION) is not supported in RHAII and returns 400.
// Contexts 1-3 require SSAR permission: create on serving.kserve.io/servingruntimes.
func (app *App) NamespaceMutationHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	namespaceName := ps.ByName("name")
	contextStr := ps.ByName("context")

	if namespaceName == "" {
		app.badRequestResponse(w, r, fmt.Errorf("namespace name is required"))
		return
	}

	contextInt, err := strconv.Atoi(contextStr)
	if err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("context must be an integer"))
		return
	}

	appCase := models.NamespaceApplicationCase(contextInt)

	if appCase == models.DSGCreation {
		app.badRequestResponse(w, r, fmt.Errorf("namespace creation (context 0) is not supported in RHAII"))
		return
	}

	if appCase < models.KServePromotion || appCase > models.ResetModelServingPlatform {
		app.badRequestResponse(w, r, fmt.Errorf("invalid context: %d (must be 1-3)", contextInt))
		return
	}

	if isSystemNamespace(namespaceName) {
		app.badRequestResponse(w, r, fmt.Errorf("cannot mutate system namespace %q", namespaceName))
		return
	}

	ctx := r.Context()
	identity, _ := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)

	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get kubernetes client: %w", err))
		return
	}

	allowed, err := client.CheckAccess(ctx, identity, "create", "serving.kserve.io", "servingruntimes", namespaceName)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to check namespace permissions: %w", err))
		return
	}
	if !allowed {
		app.forbiddenResponse(w, r, fmt.Errorf("insufficient permissions to modify serving platform in namespace %q", namespaceName))
		return
	}

	dryRun := r.URL.Query().Get("dryRun") == "All"

	result, err := app.repositories.NamespaceMutation.ApplyMutation(ctx, namespaceName, appCase, dryRun)
	if err != nil {
		app.k8sErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, result, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func isSystemNamespace(name string) bool {
	return strings.HasPrefix(name, "openshift") || strings.HasPrefix(name, "kube")
}
