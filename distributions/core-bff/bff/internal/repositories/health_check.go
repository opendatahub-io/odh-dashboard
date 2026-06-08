package repositories

import "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"

// HealthCheckRepository handles health check operations.
type HealthCheckRepository struct{}

// NewHealthCheckRepository creates a new HealthCheckRepository instance.
func NewHealthCheckRepository() *HealthCheckRepository {
	return &HealthCheckRepository{}
}

func (r *HealthCheckRepository) HealthCheck(version string) (models.HealthCheckModel, error) {
	var res = models.HealthCheckModel{
		Status: "available",
		SystemInfo: models.SystemInfo{
			Version: version,
		},
	}

	return res, nil
}
