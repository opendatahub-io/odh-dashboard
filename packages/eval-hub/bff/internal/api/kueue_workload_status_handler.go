package api

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	kubernetes "github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
)

type KueueWorkloadStatusesEnvelope Envelope[models.KueueWorkloadStatusesResponse, None]

func (app *App) KueueWorkloadStatusesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	evaluationIDs, err := parseEvaluationIDs(r.URL.Query().Get("evaluation_ids"))
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	ctx := r.Context()
	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}
	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	statuses, err := client.GetKueueWorkloadStatuses(ctx, identity, namespace, evaluationIDs)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to list Kueue Workloads: %w", err))
		return
	}
	if err := app.WriteJSON(w, http.StatusOK, KueueWorkloadStatusesEnvelope{Data: *statuses}, nil); err != nil {
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
