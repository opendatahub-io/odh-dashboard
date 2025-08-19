package mocks

import (
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/repositories"
)

// NewMockRepositories creates a new repositories struct with mock implementations
func NewMockRepositories() *repositories.Repositories {
	mockClient := NewMockLlamaStackClient()

	return repositories.NewRepositories(mockClient)
}
