package bffclient

import (
	"log/slog"
)

// CompositeClientFactory delegates to a real factory for specified targets
// and a mock factory for all others. This enables per-target control when
// MOCK_BFF_CLIENTS=true but a dev override URL is set for a specific target
// (e.g., BFF_MLFLOW_DEV_URL points to a locally running MLflow BFF).
type CompositeClientFactory struct {
	realFactory BFFClientFactory
	mockFactory BFFClientFactory
	realTargets map[BFFTarget]bool
	logger      *slog.Logger
}

// NewCompositeClientFactory creates a factory that uses real HTTP for the
// specified targets and mock responses for all others.
func NewCompositeClientFactory(
	realFactory BFFClientFactory,
	mockFactory BFFClientFactory,
	realTargets []BFFTarget,
	logger *slog.Logger,
) BFFClientFactory {
	targetMap := make(map[BFFTarget]bool, len(realTargets))
	for _, t := range realTargets {
		targetMap[t] = true
	}
	return &CompositeClientFactory{
		realFactory: realFactory,
		mockFactory: mockFactory,
		realTargets: targetMap,
		logger:      logger,
	}
}

func (f *CompositeClientFactory) CreateClient(target BFFTarget, authToken string) BFFClientInterface {
	if f.realTargets[target] {
		return f.realFactory.CreateClient(target, authToken)
	}
	return f.mockFactory.CreateClient(target, authToken)
}

func (f *CompositeClientFactory) CreateClientWithHeaders(target BFFTarget, authToken string, headers map[string]string) BFFClientInterface {
	if f.realTargets[target] {
		return f.realFactory.CreateClientWithHeaders(target, authToken, headers)
	}
	return f.mockFactory.CreateClientWithHeaders(target, authToken, headers)
}

func (f *CompositeClientFactory) GetConfig(target BFFTarget) *BFFServiceConfig {
	if f.realTargets[target] {
		return f.realFactory.GetConfig(target)
	}
	return f.mockFactory.GetConfig(target)
}

func (f *CompositeClientFactory) IsTargetConfigured(target BFFTarget) bool {
	if f.realTargets[target] {
		return f.realFactory.IsTargetConfigured(target)
	}
	return f.mockFactory.IsTargetConfigured(target)
}
