package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
)

// PrometheusQueryHandler handles POST /api/v1/prometheus/*.
// Transforms the POST body into a GET request to Prometheus/Thanos.
// No secureRoute wrapper - K8s RBAC provides authorization via the user token on the proxied request.
func (app *App) PrometheusQueryHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	var req models.PrometheusQueryRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if strings.TrimSpace(req.Query) == "" {
		app.WriteJSON(w, http.StatusBadRequest, models.PrometheusQueryResponse{ //nolint:errcheck // response write failure is non-recoverable
			Code:     http.StatusBadRequest,
			Response: []byte(`"Failed to provide a query"`),
		}, nil)
		return
	}

	queryType := resolvePrometheusQueryType(r.URL.Path)

	identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	if !ok || identity == nil {
		app.unauthorizedResponse(w, r, errors.New("missing identity"))
		return
	}
	token := identity.ResolveToken(app.devFallbackToken)

	result, err := app.repositories.Prometheus.Query(r.Context(), token, req.Query, queryType)
	if err != nil {
		var promErr models.PrometheusHTTPError
		if errors.As(err, &promErr) {
			app.WriteJSON(w, promErr.HTTPStatus(), models.PrometheusQueryResponse{ //nolint:errcheck // response write failure is non-recoverable
				Code:     promErr.HTTPStatus(),
				Response: promErr.ResponseBody(),
			}, nil)
		} else {
			escaped, _ := json.Marshal(fmt.Sprintf("Cannot fetch prometheus data, %s", err.Error()))
			app.LogError(r, err)
			app.WriteJSON(w, http.StatusInternalServerError, models.PrometheusQueryResponse{ //nolint:errcheck // response write failure is non-recoverable
				Code:     http.StatusInternalServerError,
				Response: escaped,
			}, nil)
		}
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, result, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// resolvePrometheusQueryType maps the URL sub-path to a Prometheus query type.
func resolvePrometheusQueryType(path string) string {
	switch path {
	case PrometheusQueryRangePath, PrometheusBiasPath, PrometheusServingPath:
		return "query_range"
	default:
		return "query"
	}
}
