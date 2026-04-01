package repositories

import (
	"context"
	"log/slog"

	k8sErrors "k8s.io/apimachinery/pkg/api/errors"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/mocks"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// MockSubscriptionsRepository returns mock data for development.
type MockSubscriptionsRepository struct {
	logger *slog.Logger
}

// NewMockSubscriptionsRepository creates a new mock subscriptions repository.
func NewMockSubscriptionsRepository(logger *slog.Logger) *MockSubscriptionsRepository {
	return &MockSubscriptionsRepository{logger: logger}
}

func (r *MockSubscriptionsRepository) ListSubscriptions(_ context.Context) ([]models.MaaSSubscription, error) {
	r.logger.Debug("Listing all subscriptions (mock)")
	return mocks.GetMockMaaSSubscriptions(), nil
}

func (r *MockSubscriptionsRepository) GetSubscription(_ context.Context, name string) (*models.MaaSSubscription, error) {
	r.logger.Debug("Getting subscription (mock)", slog.String("name", name))
	for _, sub := range mocks.GetMockMaaSSubscriptions() {
		if sub.Name == name {
			return &sub, nil
		}
	}
	return nil, k8sErrors.NewNotFound(constants.MaaSSubscriptionGvr.GroupResource(), name)
}

func (r *MockSubscriptionsRepository) CreateSubscription(_ context.Context, request models.CreateSubscriptionRequest) (*models.CreateSubscriptionResponse, error) {
	r.logger.Debug("Creating subscription (mock)", slog.String("name", request.Name))

	for _, sub := range mocks.GetMockMaaSSubscriptions() {
		if sub.Name == request.Name {
			return nil, k8sErrors.NewAlreadyExists(constants.MaaSSubscriptionGvr.GroupResource(), request.Name)
		}
	}

	modelRefs := make([]models.ModelRef, len(request.ModelRefs))
	for i, mr := range request.ModelRefs {
		modelRefs[i] = models.ModelRef{Name: mr.Name, Namespace: mr.Namespace}
	}

	response := &models.CreateSubscriptionResponse{
		Subscription: models.MaaSSubscription{
			Name:          request.Name,
			DisplayName:   request.DisplayName,
			Description:   request.Description,
			Namespace:     "mock-namespace",
			Phase:         "Pending",
			Priority:      request.Priority,
			Owner:         request.Owner,
			ModelRefs:     request.ModelRefs,
			TokenMetadata: request.TokenMetadata,
		},
	}

	if request.CreateAuthPolicy {
		response.AuthPolicy = &models.MaaSAuthPolicy{
			Name:      request.Name + "-policy",
			Namespace: "mock-namespace",
			Phase:     "Pending",
			ModelRefs: modelRefs,
			Subjects: models.SubjectSpec{
				Groups: request.Owner.Groups,
			},
			MeteringMetadata: request.TokenMetadata,
		}
	}

	return response, nil
}

func (r *MockSubscriptionsRepository) UpdateSubscription(_ context.Context, name string, request models.UpdateSubscriptionRequest) (*models.CreateSubscriptionResponse, error) {
	r.logger.Debug("Updating subscription (mock)", slog.String("name", name))

	var existing *models.MaaSSubscription
	for _, sub := range mocks.GetMockMaaSSubscriptions() {
		if sub.Name == name {
			existing = &sub
			break
		}
	}
	if existing == nil {
		return nil, k8sErrors.NewNotFound(constants.MaaSSubscriptionGvr.GroupResource(), name)
	}

	return &models.CreateSubscriptionResponse{
		Subscription: models.MaaSSubscription{
			Name:              existing.Name,
			DisplayName:       request.DisplayName,
			Description:       request.Description,
			Namespace:         existing.Namespace,
			Phase:             existing.Phase,
			Priority:          request.Priority,
			Owner:             request.Owner,
			ModelRefs:         request.ModelRefs,
			TokenMetadata:     request.TokenMetadata,
			CreationTimestamp: existing.CreationTimestamp,
		},
	}, nil
}

func (r *MockSubscriptionsRepository) DeleteSubscription(_ context.Context, name string) error {
	r.logger.Debug("Deleting subscription (mock)", slog.String("name", name))
	for _, sub := range mocks.GetMockMaaSSubscriptions() {
		if sub.Name == name {
			return nil
		}
	}
	return k8sErrors.NewNotFound(constants.MaaSSubscriptionGvr.GroupResource(), name)
}

func (r *MockSubscriptionsRepository) GetFormData(_ context.Context) (*models.SubscriptionFormDataResponse, error) {
	r.logger.Debug("Getting subscription form data (mock)")
	return &models.SubscriptionFormDataResponse{
		Groups:        mocks.GetMockGroups(),
		ModelRefs:     mocks.GetMockMaaSModelRefSummaries(),
		Subscriptions: mocks.GetMockMaaSSubscriptions(),
	}, nil
}

func (r *MockSubscriptionsRepository) GetAuthPoliciesForSubscription(_ context.Context, subscriptionName string) ([]models.MaaSAuthPolicy, error) {
	r.logger.Debug("Getting auth policies for subscription (mock)", slog.String("subscription", subscriptionName))
	var result []models.MaaSAuthPolicy
	for _, policy := range mocks.GetMockMaaSAuthPolicies() {
		if policy.Name == subscriptionName+"-policy" {
			result = append(result, policy)
		}
	}
	return result, nil
}

func (r *MockSubscriptionsRepository) GetModelRefSummaries(_ context.Context, _ []models.ModelSubscriptionRef) ([]models.MaaSModelRefSummary, error) {
	r.logger.Debug("Getting model ref summaries (mock)")
	return mocks.GetMockMaaSModelRefSummaries(), nil
}
