package repositories

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/maas-library/bff/internal/mocks"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// MaaSModelRefsRepository handles MaaSModelRef operations via the Kubernetes API.
type MaaSModelRefsRepository struct {
	logger *slog.Logger
}

// NewMaaSModelRefsRepository creates a new MaaSModelRef repository.
func NewMaaSModelRefsRepository(logger *slog.Logger) *MaaSModelRefsRepository {
	return &MaaSModelRefsRepository{
		logger: logger,
	}
}

// CreateMaaSModelRef creates a MaaSModelRef resource.
//
// TODO: Replace with real k8s dynamic client call:
//
//	POST maasmodelrefs.maas.opendatahub.io
func (r *MaaSModelRefsRepository) CreateMaaSModelRef(_ context.Context, request models.CreateMaaSModelRefRequest) (*models.MaaSModelRefSummary, error) {
	r.logger.Debug("Creating MaaSModelRef (mock)", slog.String("name", request.Name))

	// Check for duplicate
	for _, ref := range mocks.GetMockMaaSModelRefSummaries() {
		if ref.Name == request.Name && ref.Namespace == request.Namespace {
			return nil, fmt.Errorf("MaaSModelRef '%s' already exists", request.Name)
		}
	}

	endpoint := request.EndpointOverride
	return &models.MaaSModelRefSummary{
		Name:      request.Name,
		Namespace: request.Namespace,
		ModelRef:  request.ModelRef,
		Phase:     "Pending",
		Endpoint:  endpoint,
	}, nil
}

// UpdateMaaSModelRef updates a MaaSModelRef resource.
//
// TODO: Replace with real k8s dynamic client call:
//
//	PUT maasmodelrefs.maas.opendatahub.io/:name
func (r *MaaSModelRefsRepository) UpdateMaaSModelRef(_ context.Context, name string, request models.UpdateMaaSModelRefRequest) (*models.MaaSModelRefSummary, error) {
	r.logger.Debug("Updating MaaSModelRef (mock)", slog.String("name", name))

	for _, ref := range mocks.GetMockMaaSModelRefSummaries() {
		if ref.Name == name {
			endpoint := ref.Endpoint
			if request.EndpointOverride != "" {
				endpoint = request.EndpointOverride
			}
			return &models.MaaSModelRefSummary{
				Name:      ref.Name,
				Namespace: ref.Namespace,
				ModelRef:  request.ModelRef,
				Phase:     ref.Phase,
				Endpoint:  endpoint,
			}, nil
		}
	}
	return nil, nil
}

// DeleteMaaSModelRef deletes a MaaSModelRef resource by name.
//
// TODO: Replace with real k8s dynamic client call:
//
//	DELETE maasmodelrefs.maas.opendatahub.io/:name
func (r *MaaSModelRefsRepository) DeleteMaaSModelRef(_ context.Context, name string) error {
	r.logger.Debug("Deleting MaaSModelRef (mock)", slog.String("name", name))

	for _, ref := range mocks.GetMockMaaSModelRefSummaries() {
		if ref.Name == name {
			return nil
		}
	}
	return fmt.Errorf("MaaSModelRef '%s' not found", name)
}
