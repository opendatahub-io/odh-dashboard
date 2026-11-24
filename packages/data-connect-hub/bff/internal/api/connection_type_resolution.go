package api

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
)

func (app *App) resolveConnectionTypesParameter(w http.ResponseWriter, r *http.Request, namespace string, identity *kubernetes.RequestIdentity) (resolve, ok bool) {
	values, present := r.URL.Query()["resolve_connection_types"]
	if !present {
		return false, true
	}
	if len(values) != 1 || (values[0] != "true" && values[0] != "false") {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'resolve_connection_types' must be true or false"))
		return false, false
	}
	resolve = values[0] == "true"
	if resolve && !app.authorizeNamespace(w, r, namespace, identity, "get", "data-connection-types") {
		return false, false
	}
	return resolve, true
}

// Resolve all referenced types with one upstream list operation, including when
// multiple connections reference the same type. Never return partial results.
func resolveConnectionTypes(ctx context.Context, repository dataConnectHubReader, connections []Connection) error {
	types, err := repository.ListConnectionTypes(ctx)
	if err != nil {
		return err
	}
	byID := make(map[string]*ConnectionType, len(types))
	for i := range types {
		byID[strings.ToLower(types[i].Metadata.ID)] = &types[i]
	}
	for i := range connections {
		id := connections[i].Resource.DataConnectionTypeID
		connectionType := byID[strings.ToLower(id)]
		if connectionType == nil || connectionType.Resource.Provider == "" {
			return fmt.Errorf("could not resolve connection type %q", id)
		}
		connections[i].Resource.DataConnectionType = connectionType
	}
	return nil
}
