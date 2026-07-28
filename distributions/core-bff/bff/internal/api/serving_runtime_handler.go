package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

// CreateServingRuntimeHandler handles POST /api/v1/servingRuntimes.
// Creates a ServingRuntime CR in the specified namespace.
func (app *App) CreateServingRuntimeHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	var body map[string]any
	if err := app.ReadJSON(w, r, &body); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	namespace, err := extractNamespaceFromBody(body)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if !app.isAllowedNamespace(namespace) {
		app.forbiddenResponse(w, r, fmt.Errorf("request invalid against a resource from a non-dashboard namespace"))
		return
	}

	dryRun := ""
	if r.URL.Query().Get("dryRun") == metav1.DryRunAll {
		dryRun = metav1.DryRunAll
	}

	obj := &unstructured.Unstructured{Object: body}
	obj.SetGroupVersionKind(models.ServingRuntimeGVR.GroupVersion().WithKind("ServingRuntime"))

	result, err := app.repositories.ServingRuntime.Create(r.Context(), namespace, obj, dryRun)
	if err != nil {
		app.k8sErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, result.Object, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func extractNamespaceFromBody(body map[string]any) (string, error) {
	metadata, ok := body["metadata"]
	if !ok {
		return "", errors.New("missing metadata in request body")
	}
	metaMap, ok := metadata.(map[string]any)
	if !ok {
		return "", errors.New("metadata must be an object")
	}
	ns, ok := metaMap["namespace"]
	if !ok {
		return "", errors.New("missing metadata.namespace in request body")
	}
	nsStr, ok := ns.(string)
	if !ok || nsStr == "" {
		return "", errors.New("metadata.namespace must be a non-empty string")
	}
	return nsStr, nil
}
