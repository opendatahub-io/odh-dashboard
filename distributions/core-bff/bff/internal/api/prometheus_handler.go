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
		var unavailable *models.PrometheusUnavailableError
		var unparsable *models.PrometheusUnparsableError
		var queryErr *models.PrometheusQueryError
		var upstream *models.PrometheusUpstreamError
		switch {
		case errors.As(err, &unavailable):
			app.WriteJSON(w, http.StatusServiceUnavailable, models.PrometheusQueryResponse{ //nolint:errcheck // response write failure is non-recoverable
				Code:     http.StatusServiceUnavailable,
				Response: []byte(`"Prometheus service is not available"`),
			}, nil)
		case errors.As(err, &unparsable):
			app.WriteJSON(w, http.StatusUnprocessableEntity, models.PrometheusQueryResponse{ //nolint:errcheck // response write failure is non-recoverable
				Code:     http.StatusUnprocessableEntity,
				Response: []byte(`"Unprocessable prometheus response"`),
			}, nil)
		case errors.As(err, &queryErr):
			escaped, _ := json.Marshal(queryErr.Message)
			app.WriteJSON(w, http.StatusBadRequest, models.PrometheusQueryResponse{ //nolint:errcheck // response write failure is non-recoverable
				Code:     http.StatusBadRequest,
				Response: escaped,
			}, nil)
		case errors.As(err, &upstream):
			escaped, _ := json.Marshal(fmt.Sprintf("Cannot fetch prometheus data, %s", upstream.Body))
			app.WriteJSON(w, upstream.StatusCode, models.PrometheusQueryResponse{ //nolint:errcheck // response write failure is non-recoverable
				Code:     upstream.StatusCode,
				Response: escaped,
			}, nil)
		default:
			msg := fmt.Sprintf("Cannot fetch prometheus data, %s", err.Error())
			escaped, _ := json.Marshal(msg)
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
	switch {
	case strings.HasSuffix(path, "/queryRange"),
		strings.HasSuffix(path, "/bias"),
		strings.HasSuffix(path, "/serving"):
		return "query_range"
	default:
		return "query"
	}
}
