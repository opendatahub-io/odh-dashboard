package api

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
)

type KueueWorkloadStatusesEnvelope Envelope[models.KueueWorkloadStatusesResponse, None]

// RHOAIENG-99645: the Kueue integration is disabled. Validate the request shape (the
// contract pins the 400 paths), then return an empty status set without querying the cluster.
func (app *App) KueueWorkloadStatusesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	if _, err := parseEvaluationIDs(r.URL.Query().Get("evaluation_ids")); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	statuses := models.KueueWorkloadStatusesResponse{
		// Non-nil so the field marshals to [] rather than null, per the OpenAPI contract.
		Items: []models.KueueWorkloadStatus{},
	}
	if err := app.WriteJSON(w, http.StatusOK, KueueWorkloadStatusesEnvelope{Data: statuses}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func parseEvaluationIDs(raw string) ([]string, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, fmt.Errorf("evaluation_ids is required")
	}

	seen := make(map[string]struct{})
	evaluationIDs := make([]string, 0)
	for _, rawID := range strings.Split(raw, ",") {
		evaluationID := strings.TrimSpace(rawID)
		if evaluationID == "" {
			return nil, fmt.Errorf("evaluation_ids must not contain empty values")
		}
		if _, found := seen[evaluationID]; found {
			continue
		}
		seen[evaluationID] = struct{}{}
		evaluationIDs = append(evaluationIDs, evaluationID)
	}
	if len(evaluationIDs) > maxLimit {
		return nil, fmt.Errorf("evaluation_ids must contain at most %d values", maxLimit)
	}

	return evaluationIDs, nil
}
