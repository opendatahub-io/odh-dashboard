package repositories

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/maas-library/bff/internal/mocks"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// SubscriptionsRepository handles subscription operations via the Kubernetes API.
type SubscriptionsRepository struct {
	logger *slog.Logger
}

// NewSubscriptionsRepository creates a new subscriptions repository.
func NewSubscriptionsRepository(logger *slog.Logger) *SubscriptionsRepository {
	return &SubscriptionsRepository{
		logger: logger,
	}
}

// ListSubscriptions returns all MaaSSubscription resources.
// TODO: Replace with real k8s dynamic client call: GET maassubscriptions.maas.opendatahub.io
func (r *SubscriptionsRepository) ListSubscriptions(_ context.Context) ([]models.MaaSSubscription, error) {
	r.logger.Debug("Listing all subscriptions (mock)")
	return mocks.GetMockMaaSSubscriptions(), nil
}

// GetSubscription returns a specific MaaSSubscription by name.
// TODO: Replace with real k8s dynamic client call: GET maassubscriptions.maas.opendatahub.io/:name
func (r *SubscriptionsRepository) GetSubscription(_ context.Context, name string) (*models.MaaSSubscription, error) {
	r.logger.Debug("Getting subscription", slog.String("name", name))
	for _, sub := range mocks.GetMockMaaSSubscriptions() {
		if sub.Name == name {
			return &sub, nil
		}
	}
	return nil, nil
}

// CreateSubscription creates a MaaSSubscription and MaaSAuthPolicy.
//
// TODO: Replace with real k8s dynamic client calls:
//
//	CREATE maassubscriptions.maas.opendatahub.io
//	CREATE maasauthpolicies.maas.opendatahub.io
func (r *SubscriptionsRepository) CreateSubscription(_ context.Context, request models.CreateSubscriptionRequest) (*models.CreateSubscriptionResponse, error) {
	r.logger.Debug("Creating subscription (mock)", slog.String("name", request.Name))

	// Check for duplicate
	for _, sub := range mocks.GetMockMaaSSubscriptions() {
		if sub.Name == request.Name {
			return nil, fmt.Errorf("MaaSSubscription '%s' already exists", request.Name)
		}
	}

	// Build mock response from request
	modelRefs := make([]models.ModelRef, len(request.ModelRefs))
	for i, mr := range request.ModelRefs {
		modelRefs[i] = models.ModelRef{Name: mr.Name, Namespace: mr.Namespace}
	}

	return &models.CreateSubscriptionResponse{
		Subscription: models.MaaSSubscription{
			Name:          request.Name,
			Namespace:     request.Namespace,
			Phase:         "Pending",
			Priority:      request.Priority,
			Owner:         request.Owner,
			ModelRefs:     request.ModelRefs,
			TokenMetadata: request.TokenMetadata,
		},
		AuthPolicy: models.MaaSAuthPolicy{
			Name:      request.Name + "-policy",
			Namespace: request.Namespace,
			Phase:     "Pending",
			ModelRefs: modelRefs,
			Subjects: models.SubjectSpec{
				Groups: request.Owner.Groups,
			},
			MeteringMetadata: request.TokenMetadata,
		},
	}, nil
}

// UpdateSubscription updates a MaaSSubscription and MaaSAuthPolicy.
//
// TODO: Replace with real k8s dynamic client calls:
//
//	PUT maassubscriptions.maas.opendatahub.io/:name
//	PUT maasauthpolicies.maas.opendatahub.io/:name
func (r *SubscriptionsRepository) UpdateSubscription(_ context.Context, name string, request models.UpdateSubscriptionRequest) (*models.CreateSubscriptionResponse, error) {
	r.logger.Debug("Updating subscription (mock)", slog.String("name", name))

	// Find existing subscription
	var existing *models.MaaSSubscription
	for _, sub := range mocks.GetMockMaaSSubscriptions() {
		if sub.Name == name {
			existing = &sub
			break
		}
	}
	if existing == nil {
		return nil, nil
	}

	modelRefs := make([]models.ModelRef, len(request.ModelRefs))
	for i, mr := range request.ModelRefs {
		modelRefs[i] = models.ModelRef{Name: mr.Name, Namespace: mr.Namespace}
	}

	return &models.CreateSubscriptionResponse{
		Subscription: models.MaaSSubscription{
			Name:              existing.Name,
			Namespace:         existing.Namespace,
			Phase:             existing.Phase,
			Priority:          request.Priority,
			Owner:             request.Owner,
			ModelRefs:         request.ModelRefs,
			TokenMetadata:     request.TokenMetadata,
			CreationTimestamp: existing.CreationTimestamp,
		},
		AuthPolicy: models.MaaSAuthPolicy{
			Name:      existing.Name + "-policy",
			Namespace: existing.Namespace,
			Phase:     existing.Phase,
			ModelRefs: modelRefs,
			Subjects: models.SubjectSpec{
				Groups: request.Owner.Groups,
			},
			MeteringMetadata: request.TokenMetadata,
		},
	}, nil
}

// DeleteSubscription deletes a MaaSSubscription by name.
// TODO: Replace with real k8s dynamic client call: DELETE maassubscriptions.maas.opendatahub.io/:name
func (r *SubscriptionsRepository) DeleteSubscription(_ context.Context, name string) error {
	r.logger.Debug("Deleting subscription (mock)", slog.String("name", name))

	for _, sub := range mocks.GetMockMaaSSubscriptions() {
		if sub.Name == name {
			return nil
		}
	}
	return fmt.Errorf("MaaSSubscription '%s' not found", name)
}

// GetFormData returns groups and model refs for the subscription creation form.
//
// TODO: Replace with real k8s calls:
//
//	GET groups (user.openshift.io/v1)
//	GET maasmodelrefs.maas.opendatahub.io
func (r *SubscriptionsRepository) GetFormData(_ context.Context) (*models.SubscriptionFormDataResponse, error) {
	r.logger.Debug("Getting subscription form data (mock)")
	return &models.SubscriptionFormDataResponse{
		Groups:    mocks.GetMockGroups(),
		ModelRefs: mocks.GetMockMaaSModelRefSummaries(),
	}, nil
}

// GetAuthPoliciesForSubscription returns MaaSAuthPolicy resources associated with a subscription.
// TODO: Replace with real k8s call: GET maasauthpolicies.maas.opendatahub.io
func (r *SubscriptionsRepository) GetAuthPoliciesForSubscription(_ context.Context, subscriptionName string) ([]models.MaaSAuthPolicy, error) {
	r.logger.Debug("Getting auth policies for subscription (mock)", slog.String("subscription", subscriptionName))

	var result []models.MaaSAuthPolicy
	for _, policy := range mocks.GetMockMaaSAuthPolicies() {
		if policy.Name == subscriptionName+"-policy" {
			result = append(result, policy)
		}
	}
	return result, nil
}

// GetModelRefSummaries returns MaaSModelRef summaries for the given model refs.
// TODO: Replace with real k8s call: GET maasmodelrefs.maas.opendatahub.io
func (r *SubscriptionsRepository) GetModelRefSummaries(_ context.Context, _ []models.ModelSubscriptionRef) ([]models.MaaSModelRefSummary, error) {
	r.logger.Debug("Getting model ref summaries (mock)")
	return mocks.GetMockMaaSModelRefSummaries(), nil
}
