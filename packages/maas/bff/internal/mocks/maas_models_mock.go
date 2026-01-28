package mocks

import "github.com/opendatahub-io/maas-library/bff/internal/models"

// GetMockMaaSModels returns a static list of MaaS models.
func GetMockMaaSModels() []models.MaaSModel {
	return []models.MaaSModel{
		{
			ID:      "granite-3-8b-instruct",
			Object:  "model",
			Created: 1714521600,
			OwnedBy: "ibm",
			Ready:   true,
			URL:     "https://example.com/models/granite-3-8b-instruct",
		},
		{
			ID:      "flan-t5-small",
			Object:  "model",
			Created: 1672531200,
			OwnedBy: "google",
			Ready:   true,
			URL:     "https://example.com/models/flan-t5-small",
		},
	}
}

