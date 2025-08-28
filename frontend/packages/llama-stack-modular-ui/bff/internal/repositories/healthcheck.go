package repositories

import "github.com/opendatahub-io/llama-stack-modular-ui/internal/models"

type HealthCheckRepository struct{}

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
