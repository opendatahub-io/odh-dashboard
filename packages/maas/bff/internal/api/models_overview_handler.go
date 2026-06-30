package api

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// ListModelsOverviewHandler handles GET /api/v1/overview/models.
// It fetches MaaSModelRef, MaaSSubscription, and MaaSAuthPolicy resources directly from
// Kubernetes and returns each model enriched with its associated subscriptions and auth policies.
func ListModelsOverviewHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	app.logger.Debug("Handling models overview request")

	modelRefs, err := app.repositories.MaaSModelRefs.ListMaaSModelRefs(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to list MaaSModelRefs: %w", err))
		return
	}
	app.logger.Debug("Fetched MaaSModelRefs", slog.Int("count", len(modelRefs)))

	subscriptions, err := app.repositories.Subscriptions.ListSubscriptions(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to list MaaSSubscriptions: %w", err))
		return
	}
	app.logger.Debug("Fetched MaaSSubscriptions", slog.Int("count", len(subscriptions)))

	policies, err := app.repositories.Policies.ListPolicies(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to list MaaSAuthPolicies: %w", err))
		return
	}
	app.logger.Debug("Fetched MaaSAuthPolicies", slog.Int("count", len(policies)))

	// Build subscription lookup: model name → []ModelOverviewSubscription.
	subsByModel := make(map[string][]models.ModelOverviewSubscription)
	for _, sub := range subscriptions {
		groups := groupNames(sub.Owner.Groups)
		for _, ref := range sub.ModelRefs {
			rateLimits := make([]models.TokenRateLimit, len(ref.TokenRateLimits))
			copy(rateLimits, ref.TokenRateLimits)
			subsByModel[ref.Name] = append(subsByModel[ref.Name], models.ModelOverviewSubscription{
				Name:            sub.Name,
				DisplayName:     sub.DisplayName,
				Phase:           sub.Phase,
				Groups:          groups,
				TokenRateLimits: rateLimits,
			})
		}
	}

	// Build policy lookup: model name → []ModelOverviewPolicy.
	policiesByModel := make(map[string][]models.ModelOverviewPolicy)
	for _, policy := range policies {
		groups := groupNames(policy.Subjects.Groups)
		for _, ref := range policy.ModelRefs {
			policiesByModel[ref.Name] = append(policiesByModel[ref.Name], models.ModelOverviewPolicy{
				Name:        policy.Name,
				DisplayName: policy.DisplayName,
				Phase:       policy.Phase,
				Groups:      groups,
			})
		}
	}

	// Assemble one overview item per MaaSModelRef CR.
	items := make([]models.ModelOverviewItem, 0, len(modelRefs))
	for _, ref := range modelRefs {
		subs := subsByModel[ref.Name]
		if subs == nil {
			subs = []models.ModelOverviewSubscription{}
		}
		policies := policiesByModel[ref.Name]
		if policies == nil {
			policies = []models.ModelOverviewPolicy{}
		}

		items = append(items, models.ModelOverviewItem{
			ID: ref.Name,
			ModelDetails: models.ModelOverviewDetails{
				DisplayName: ref.DisplayName,
				Description: ref.Description,
				Phase:       ref.Phase,
			},
			Subscriptions: subs,
			AuthPolicies:  policies,
		})
	}

	app.logger.Debug("Assembled models overview", slog.Int("models", len(items)))

	response := Envelope[[]models.ModelOverviewItem, None]{
		Data: items,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// groupNames extracts the Name from a slice of GroupReference.
func groupNames(refs []models.GroupReference) []string {
	if len(refs) == 0 {
		return nil
	}
	names := make([]string, len(refs))
	for i, g := range refs {
		names[i] = g.Name
	}
	return names
}
